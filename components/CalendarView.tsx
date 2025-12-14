
import React, { useState } from 'react';
import { Order } from '../types';
import { useLanguage } from '../useLanguage';

interface CalendarViewProps {
    orders: Order[];
    onOrderClick: (order: Order) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ orders, onOrderClick }) => {
    const { t, language } = useLanguage();
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const firstDayOfWeek = 6; // Saturday for both languages

    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - (startDate.getDay() - firstDayOfWeek + 7) % 7);

    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + ( (6 - endDate.getDay() + firstDayOfWeek + 7) % 7) );


    const days = [];
    let day = startDate;
    while (day <= endDate) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }
    
    const ordersByDate: { [key: string]: Order[] } = {};
    orders.forEach(order => {
        const dateKey = new Date(order.dateTime).toDateString();
        if (!ordersByDate[dateKey]) {
            ordersByDate[dateKey] = [];
        }
        ordersByDate[dateKey].push(order);
    });

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const weekDays = [
        t('calendar.weekdays.sat'), 
        t('calendar.weekdays.sun'), 
        t('calendar.weekdays.mon'), 
        t('calendar.weekdays.tue'), 
        t('calendar.weekdays.wed'), 
        t('calendar.weekdays.thu'), 
        t('calendar.weekdays.fri')
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">{t('calendar.title')}</h1>
                <div className="flex items-center gap-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full bg-[#1C2541] hover:bg-[#2A3450]">&lt;</button>
                    <h2 className="text-xl font-semibold text-white">
                        {currentDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full bg-[#1C2541] hover:bg-[#2A3450]">&gt;</button>
                </div>
            </div>

            <div className="bg-[#1C2541] rounded-xl shadow-lg p-4">
                <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-400 mb-2">
                    {weekDays.map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((d, i) => {
                        const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                        const isToday = d.toDateString() === new Date().toDateString();
                        const dailyOrders = ordersByDate[d.toDateString()] || [];

                        return (
                            <div key={i} className={`h-28 rounded-lg p-2 flex flex-col ${isCurrentMonth ? 'bg-[#0B132B]' : 'bg-[#0B132B]/50'} ${isToday ? 'border-2 border-[#F7C873]' : ''}`}>
                                <span className={`font-bold ${isCurrentMonth ? 'text-white' : 'text-gray-600'}`}>{d.getDate()}</span>
                                <div className="mt-1 overflow-y-auto text-xs space-y-1 custom-scrollbar">
                                    {dailyOrders.map(order => (
                                        <div 
                                            key={order.id} 
                                            onClick={() => onOrderClick(order)}
                                            className="bg-yellow-500/20 text-yellow-200 p-1 rounded text-start cursor-pointer hover:bg-yellow-500/40 transition-colors"
                                            title={order.title}
                                        >
                                            {order.title.substring(0, 15)}{order.title.length > 15 ? '...' : ''}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
