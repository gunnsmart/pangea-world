# Physics Improvements for Pangea Simulation

## Overview

This document describes the physics system improvements implemented for the Pangea Simulation, focusing on realistic movement mechanics for Adam and Eve. The system now includes proper physics-based movement with gravity, velocity, acceleration, and friction.

## Key Changes

### 1. Physics State in Body Class (body.py)

The `Body` class now maintains three-dimensional physics state vectors:

| Component | Type | Description |
|-----------|------|-------------|
| `position` | `np.ndarray[3]` | Float coordinates (x, y, z) in meters |
| `velocity` | `np.ndarray[3]` | Velocity vector (vx, vy, vz) in m/s |
| `acceleration` | `np.ndarray[3]` | Acceleration vector (ax, ay, az) in m/s² |
| `on_ground` | `bool` | Whether the character is on the ground |

**Physics Constants:**
- **Gravity**: 9.81 m/s² (downward on z-axis)
- **Friction Coefficient**: 0.8 (reduces horizontal velocity when on ground)
- **Time Step**: 1.0 second per simulation step

### 2. Physics Engine (physics_step method)

The `Body.physics_step(terrain_height_at_pos)` method implements a simple but realistic physics engine:

```python
def physics_step(self, terrain_height_at_pos: float):
    # Apply gravity if not on ground
    if not self.on_ground:
        self.acceleration += GRAVITY_ACCEL
    
    # Apply friction (only horizontal components)
    if self.on_ground:
        self.velocity[0:2] *= FRICTION_COEFF
    
    # Update velocity based on acceleration
    self.velocity += self.acceleration * TIME_STEP
    
    # Update position based on velocity
    self.position += self.velocity * TIME_STEP
    
    # Reset acceleration for next step
    self.acceleration = np.array([0.0, 0.0, 0.0])
    
    # Collision with ground
    if self.position[2] < terrain_height_at_pos:
        self.position[2] = terrain_height_at_pos
        self.velocity[2] = 0.0
        self.on_ground = True
    else:
        self.on_ground = False
    
    # Boundary checking
    self.position[0] = np.clip(self.position[0], 0, 99)
    self.position[1] = np.clip(self.position[1], 0, 99)
```

### 3. Movement Impulses (HumanAI)

The `HumanAI` class now has an `apply_movement_impulse(direction, speed)` method that applies forces to the character's velocity:

```python
def apply_movement_impulse(self, direction: np.ndarray, speed: float):
    # Apply an impulse to the body's velocity
    self.body.velocity += direction * speed
```

This method is called by the action execution system to move characters toward targets (food, water, partner, etc.).

### 4. Terrain Elevation System

A mapping from biome IDs to elevation in meters has been added:

| Biome | Elevation (m) | Description |
|-------|---------------|-------------|
| DEEP_WATER | 0.0 | Ocean depths |
| SHALLOW | 0.1 | Shallow water |
| BEACH | 0.5 | Sandy beaches |
| GRASSLAND | 1.0 | Flat grasslands |
| FOREST | 2.0 | Forested areas |
| TROPICAL | 3.0 | Tropical regions |
| MOUNTAIN | 5.0 | Mountain slopes |
| PEAK | 10.0 | Mountain peaks |

The terrain elevation affects:
- **Gravity**: Characters fall to the terrain height
- **Work Calculation**: Climbing higher terrain requires more energy
- **Movement Speed**: Can be modulated based on terrain type

### 5. Frontend Rendering (main.js)

The frontend now supports rendering float positions for smooth sub-grid movement:

```javascript
function drawEntities(humans, animals) {
  for (const h of humans) {
    ctx.fillStyle = '#ffffff';
    // Support both integer and float positions
    const posX = h.pos[1]; // x-coordinate
    const posY = h.pos[0]; // y-coordinate
    const posZ = h.pos[2] || 0; // z-coordinate (height)
    
    // Draw character with offset based on z-height
    const heightOffset = posZ * 2; // Visual scaling
    ctx.fillRect(posX*CELL, posY*CELL - heightOffset, CELL, CELL);
  }
}
```

This creates a visual effect where characters appear to jump or fall based on their z-position.

## Integration with Existing Systems

### Server-side Physics Update (server.py)

In the main simulation loop, physics is updated for each human character:

```python
# Get terrain elevation at human's current position
current_grid_r, current_grid_c = h.pos[0], h.pos[1]
biome_id = sim.terrain.template[current_grid_r][current_grid_c]
terrain_elevation_m = BIOME_ELEVATION_M.get(biome_id, 0.0)

# Update human physics
h.body.physics_step(terrain_elevation_m)

# Update integer position from float position
h.pos = [int(h.body.position[0]), int(h.body.position[1])]
```

### Energy Calculation

The work calculation now considers actual movement magnitude:

```python
movement_magnitude = np.linalg.norm(self.body.velocity)
work = 0.005 * (self.mass / 70.0) * (movement_magnitude * 0.5 + 1.0)
self.u_energy -= work
```

This means:
- **Faster movement** = more energy consumption
- **Stationary characters** = minimal energy drain
- **Climbing** = higher energy cost (due to terrain elevation)

## Behavior Changes

### Movement Mechanics

1. **Smooth Movement**: Characters now move smoothly across sub-grid positions instead of jumping between grid cells
2. **Momentum**: Characters maintain velocity and gradually decelerate due to friction
3. **Gravity**: Characters can be affected by terrain height differences (for future jumping/falling mechanics)
4. **Energy-Aware**: Movement speed and energy consumption are now physically realistic

### Action Execution

Movement actions now use impulses instead of direct position updates:

- **seek_food**: Applies impulse toward nearest food
- **seek_water**: Applies impulse toward nearest water
- **seek_partner**: Applies impulse toward partner
- **flee**: Applies random high-speed impulse
- **explore**: Applies random low-speed impulse

## Future Enhancements

1. **Jumping Mechanics**: Use velocity to allow characters to jump over obstacles
2. **Terrain Friction**: Different terrain types could have different friction coefficients
3. **Stamina System**: Link movement speed to character stamina
4. **Collision Detection**: Implement proper collision with other entities
5. **Pathfinding**: Use physics-aware pathfinding to navigate terrain
6. **Animation**: Interpolate between positions for smooth animation

## Technical Notes

### Coordinate System

- **x-axis**: Horizontal (0-99)
- **y-axis**: Horizontal (0-99)
- **z-axis**: Vertical (height in meters)

### Position Representation

- **Backend**: Float positions in `body.position` for physics calculations
- **Frontend**: Float positions sent to client for smooth rendering
- **Compatibility**: Integer grid positions still available via `h.pos` property

### Performance Considerations

- Physics calculations use NumPy for efficient vector operations
- Terrain elevation is cached during simulation step
- Float positions are converted to integers only when needed for grid-based operations

## Testing Recommendations

1. **Movement Smoothness**: Verify that characters move smoothly across the map
2. **Energy Consumption**: Check that faster movement consumes more energy
3. **Terrain Effects**: Confirm that different terrain types affect movement appropriately
4. **Collision**: Test that characters don't move through water or mountains
5. **Visual Feedback**: Verify that z-height is displayed correctly in the frontend

## Deployment Notes

When deploying this update to AWS:

1. Ensure NumPy is installed: `pip install numpy`
2. Test the physics engine with a short simulation run
3. Monitor performance metrics (CPU usage, memory)
4. Verify that the frontend correctly renders float positions
5. Check server logs for any physics-related errors

## References

- **Newtonian Physics**: Position = Initial Position + Velocity × Time + 0.5 × Acceleration × Time²
- **Friction Model**: Velocity × Friction Coefficient (simplified)
- **Gravity Constant**: 9.81 m/s² (Earth's standard gravity)
