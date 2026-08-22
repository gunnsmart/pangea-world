
import { useSimulationStore } from '../store/useSimulationStore';

export type InterventionType = 'SOLAR_FLARE' | 'AERO_BLOOM' | 'STASIS_PROTOCOL' | 'RESOURCE_INJECTION';

export const interventionService = {
  trigger(type: InterventionType) {
    const { snapshot, isPaused } = useSimulationStore.getState();
    if (!snapshot) return;

    console.log(`[PANGEA_OS] Executing Intervention: ${type}`);

    // In a real implementation, we would send a message to the worker.
    // For now, we will handle some effects via the store or event bus.
    const event = new CustomEvent('pangea-intervention', { detail: { type } });
    window.dispatchEvent(event);
  }
};
