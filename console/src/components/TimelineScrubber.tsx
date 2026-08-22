
import React from 'react';
import { TimelineEvent } from '../services/historyService';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { 
  Baby, 
  Skull, 
  Zap, 
  Clock, 
  Star,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface TimelineScrubberProps {
  events: TimelineEvent[];
  currentDay: number;
  onSelectEvent: (event: TimelineEvent) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({ events, currentDay, onSelectEvent }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birth': return <Baby className="w-3 h-3 text-tertiary" />;
      case 'death': return <Skull className="w-3 h-3 text-error" />;
      case 'milestone': return <Star className="w-3 h-3 text-secondary" />;
      case 'time_skip': return <Clock className="w-3 h-3 text-primary" />;
      default: return <Zap className="w-3 h-3 text-dim" />;
    }
  };

  return (
    <div className="relative group">
      {/* Navigation Buttons for a long timeline */}
      <button 
        onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-full bg-gradient-to-r from-background to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-start pl-2"
      >
        <ChevronLeft className="w-4 h-4 text-primary" />
      </button>

      <div 
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar flex items-end gap-1 px-12 py-6 min-h-[120px] bg-white/5 border-y border-white/5"
      >
        {/* Generate background slots for all days up to currentDay */}
        {Array.from({ length: Math.max(currentDay + 1, 10) }).map((_, day) => {
          const dayEvents = events.filter(e => e.day === day);
          const hasMilestone = dayEvents.some(e => e.event_type === 'milestone');
          
          return (
            <div key={`day-${day}`} className="flex-shrink-0 flex flex-col items-center gap-2 w-12 transition-all hover:w-16">
              {/* Event Stack */}
              <div className="flex flex-col-reverse gap-1 mb-1 min-h-[40px]">
                {dayEvents.map((event, i) => (
                  <motion.button
                    key={`${day}-${i}`}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSelectEvent(event)}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center border transition-all",
                      event.event_type === 'milestone' 
                        ? "bg-secondary/20 border-secondary shadow-[0_0_10px_rgba(251,191,36,0.3)]" 
                        : "bg-white/5 border-white/10 hover:border-primary/50"
                    )}
                    title={event.description}
                  >
                    {getEventIcon(event.event_type)}
                  </motion.button>
                ))}
              </div>

              {/* Day Marker */}
              <div className={cn(
                "w-0.5 h-4 rounded-full transition-colors",
                dayEvents.length > 0 ? "bg-primary" : "bg-white/10"
              )} />
              
              <div className={cn(
                "text-[8px] font-mono font-bold tracking-tighter uppercase",
                day === currentDay ? "text-primary" : "text-dim/40"
              )}>
                D_{day.toString().padStart(2, '0')}
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-full bg-gradient-to-l from-background to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end pr-2"
      >
        <ChevronRight className="w-4 h-4 text-primary" />
      </button>
    </div>
  );
};
