
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { getTodayDateString } from '../utils/helpers';

interface DatePickerProps {
    selectedDates: string[];
    onDatesChange: (dates: string[]) => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ selectedDates, onDatesChange }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [isOpen, setIsOpen] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0); // Normalize to start of day
        return d;
    }, []);

    // Calculate the Sunday of the current week (Accounting Week Close)
    const endOfCurrentWeek = useMemo(() => {
        const d = new Date(today);
        const currentDayOfWeek = d.getDay(); // 0 (Sun) to 6 (Sat)
        
        // If today is Sunday (0), today is the limit.
        // If today is Mon (1) -> Sat (6), calculate days remaining until Sunday (7 - day).
        const daysUntilSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
        
        d.setDate(d.getDate() + daysUntilSunday);
        d.setHours(23, 59, 59, 999);
        return d;
    }, [today]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);


    const handleDateClick = (date: Date) => {
        // Strict Validation: Cannot be past today AND cannot be past this Sunday
        if (date < today || date > endOfCurrentWeek) return; 

        const dateString = date.toISOString().split('T')[0];
        
        const newDates = selectedDates.includes(dateString)
            ? selectedDates.filter(d => d !== dateString)
            : [...selectedDates, dateString];
            
        onDatesChange(newDates.sort());
    };

    const handleRemoveDate = (dateToRemove: string) => {
        onDatesChange(selectedDates.filter(date => date !== dateToRemove));
    };
    
    const changeMonth = (offset: number) => {
        setViewDate(current => {
            const newDate = new Date(current);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const monthName = viewDate.toLocaleString('default', { month: 'long' });

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const calendarDays: (Date | null)[] = [];
        
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDays.push(null);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            calendarDays.push(new Date(year, month, i));
        }

        const todayString = getTodayDateString();
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return (
            <div>
                <div className="flex justify-between items-center mb-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-light-surface dark:hover:bg-dark-surface" aria-label="Previous month">
                        <svg data-lucide="chevron-left" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <div className="font-bold text-lg">{monthName} {year}</div>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-light-surface dark:hover:bg-dark-surface" aria-label="Next month">
                       <svg data-lucide="chevron-right" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                    {weekdays.map(day => <div key={day} aria-hidden="true">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((date, index) => {
                        if (!date) return <div key={`empty-${index}`}></div>;

                        const dateString = date.toISOString().split('T')[0];
                        const isSelected = selectedDates.includes(dateString);
                        const isToday = dateString === todayString;
                        
                        // LOGIC: Disable Past Dates AND Future Dates beyond this Sunday
                        const isPast = date < today;
                        const isAfterWeekClose = date > endOfCurrentWeek;
                        const isDisabled = isPast || isAfterWeekClose;

                        const baseClasses = "w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-200";
                        let dynamicClasses = "";
                        
                        if (isDisabled) {
                            dynamicClasses = "text-gray-300 dark:text-gray-700 cursor-not-allowed opacity-50";
                            if (isAfterWeekClose) dynamicClasses += " bg-gray-100 dark:bg-gray-800/30"; // Visual cue for "Closed" future days
                        } else {
                            dynamicClasses = "cursor-pointer hover:bg-light-surface dark:hover:bg-dark-surface font-semibold";
                            if (isSelected) {
                                dynamicClasses += " bg-neon-cyan text-black font-bold ring-2 ring-offset-2 ring-neon-cyan ring-offset-light-card dark:ring-offset-dark-card";
                            } else if (isToday) {
                                dynamicClasses += " border-2 border-neon-pink text-neon-pink";
                            }
                        }

                        return (
                            <div key={dateString} className="flex justify-center items-center">
                                <button
                                    onClick={() => handleDateClick(date)}
                                    disabled={isDisabled}
                                    className={`${baseClasses} ${dynamicClasses}`}
                                    aria-label={`Select date ${dateString}`}
                                    aria-pressed={isSelected}
                                    title={isAfterWeekClose ? "Cannot bet beyond current week (Sunday)" : ""}
                                >
                                    {date.getDate()}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const getDisplayText = () => {
        if (selectedDates.length === 0) return "Select bet dates...";
        if (selectedDates.length === 1) return selectedDates[0];
        return `${selectedDates.length} dates selected`;
    };

    return (
        <div ref={datePickerRef} className={`relative bg-light-card dark:bg-dark-card p-4 rounded-xl shadow-lg animate-fade-in ${isOpen ? 'z-30' : 'z-0'}`}>
             <div className="relative">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold text-lg">Bet Dates</h2>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Week Closing: Sun</span>
                </div>
                <button
                    id="main-date-picker-btn" /* Added ID for Focus Loop */
                    onClick={() => setIsOpen(prev => !prev)}
                    className="w-full flex justify-between items-center p-3 bg-light-surface dark:bg-dark-surface rounded-lg border-2 border-transparent focus-within:border-neon-cyan focus:outline-none transition-colors"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                >
                    <span>{getDisplayText()}</span>
                    <svg data-lucide="calendar-days" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-light-card dark:bg-dark-card p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-20">
                        {renderCalendar()}
                    </div>
                )}
            </div>

            {selectedDates.length > 0 && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                    <h3 className="font-semibold text-sm mb-2">Selected Dates ({selectedDates.length}):</h3>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {selectedDates.map(date => (
                            <div key={date} className="flex items-center gap-2 bg-light-surface dark:bg-dark-surface rounded-full px-3 py-1 text-sm">
                                <span>{date}</span>
                                <button onClick={() => handleRemoveDate(date)} className="text-red-500 hover:text-red-400" aria-label={`Remove date ${date}`}>
                                    <svg data-lucide="x-circle" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;
