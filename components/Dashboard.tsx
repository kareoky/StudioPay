
import React, { useState } from 'react';
import { Order, Client, View } from '../types';
import { useLanguage } from '../useLanguage';

interface DashboardProps {
    userName: string;
    orders: Order[];
    clients: Client[];
    setView: (view: View) => void;
    onAddNewOrder: () => void;
    onAddNewClient: () => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactElement; color: string }> = ({ title, value, icon, color }) => (
    <div className={`bg-[#1C2541] p-6 rounded-xl flex items-center shadow-lg border-s-4 ${color}`}>
        <div className="me-4">{icon}</div>
        <div>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const QuickActionButton: React.FC<{ onClick: () => void; label: string; icon: React.ReactElement }> = ({ onClick, label, icon }) => (
    <button
        onClick={onClick}
        className="flex-1 bg-[#F7C873] text-[#0B132B] font-bold py-3 px-4 rounded-lg flex items-center justify-center hover:bg-yellow-400 transition-colors duration-200"
    >
        {icon}
        <span className="ms-2">{label}</span>
    </button>
);


const Dashboard: React.FC<DashboardProps> = ({ userName, orders, clients, setView, onAddNewOrder, onAddNewClient }) => {
    const { t, language } = useLanguage();
    const [scheduleView, setScheduleView] = useState<'today' | 'week'>('today');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysBookings = orders.filter(order => {
        const orderDate = new Date(order.dateTime);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime() && order.status === 'confirmed';
    });

    const upcomingBookings = orders.filter(order => new Date(order.dateTime) > new Date() && order.status === 'confirmed');

    const totalRevenueThisMonth = orders
        .filter(order => new Date(order.dateTime).getMonth() === new Date().getMonth() && new Date(order.dateTime).getFullYear() === new Date().getFullYear() && order.status === 'completed')
        .reduce((sum, order) => sum + order.priceAmount, 0);
        
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 }).format(amount);
    }

    const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || t('common.unknown_client');
    
    const now = new Date();
    const todayForWeekCalc = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = todayForWeekCalc.getDay(); 
    const weekStartsOn = 6; 

    let dayOffset = dayOfWeek - weekStartsOn;
    if (dayOffset < 0) {
        dayOffset += 7;
    }

    const startOfWeek = new Date(todayForWeekCalc.getFullYear(), todayForWeekCalc.getMonth(), todayForWeekCalc.getDate() - dayOffset);
    const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6, 23, 59, 59, 999);
    
    const thisWeeksBookings = orders
        .filter(order => {
            const orderDate = new Date(order.dateTime);
            return orderDate >= startOfWeek && orderDate <= endOfWeek && order.status === 'confirmed';
        })
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    const bookingsToShow = scheduleView === 'today' ? todaysBookings : thisWeeksBookings;
    const scheduleTitle = scheduleView === 'today' ? t('dashboard.todays_schedule') : t('dashboard.this_weeks_schedule');
    const noBookingsMessage = scheduleView === 'today' ? t('dashboard.no_bookings_today') : t('dashboard.no_bookings_this_week');

    const openInGoogleMaps = (lat: number, lng: number) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank');
    };

    const handleAddToCalendar = (order: Order) => {
        const startDate = new Date(order.dateTime);
        const endDate = new Date(startDate.getTime() + (order.duration * 60000));
        
        // Helper to format date for ICS: YYYYMMDDTHHMMSSZ
        const formatICSDate = (date: Date) => {
             return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const client = clients.find(c => c.id === order.clientId);
        const description = `${t('orders.table.client')}: ${client?.name || ''}\\n${t('add_client.form.phone')}: ${client?.phone || ''}\\n${t('add_order.form.package_name')}: ${order.servicePackage.name}\\n${t('add_order.form.notes')}: ${order.notes || ''}`;
        
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//StudioPay//StudioPay App//EN
BEGIN:VEVENT
UID:${order.id}@studiopay.app
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${order.title} - StudioPay
DESCRIPTION:${description}
LOCATION:${order.location.addressText || ''}
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `event_${order.id}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">{t('dashboard.welcome', { name: userName })}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title={t('dashboard.revenue_this_month')} value={formatCurrency(totalRevenueThisMonth)} color="border-green-400" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} />
                <StatCard title={t('dashboard.bookings_today')} value={todaysBookings.length} color="border-blue-400" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                <StatCard title={t('dashboard.upcoming_bookings')} value={upcomingBookings.length} color="border-yellow-400" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>} />
            </div>

            <div className="flex flex-col md:flex-row gap-6 mb-8">
                 <QuickActionButton onClick={onAddNewOrder} label={t('dashboard.add_new_booking')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>} />
                 <QuickActionButton onClick={onAddNewClient} label={t('dashboard.add_new_client')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>} />
            </div>

            <div className="bg-[#1C2541] p-6 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-white">{scheduleTitle}</h2>
                    <div className="flex bg-[#0B132B] p-1 rounded-lg self-start sm:self-center">
                        <button 
                            onClick={() => setScheduleView('today')}
                            className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${scheduleView === 'today' ? 'bg-[#F7C873] text-[#0B132B]' : 'text-gray-400 hover:text-white'}`}
                        >
                            {t('dashboard.view_today')}
                        </button>
                        <button
                            onClick={() => setScheduleView('week')}
                            className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${scheduleView === 'week' ? 'bg-[#F7C873] text-[#0B132B]' : 'text-gray-400 hover:text-white'}`}
                        >
                            {t('dashboard.view_week')}
                        </button>
                    </div>
                </div>
                {bookingsToShow.length > 0 ? (
                     <div className="space-y-4">
                        {bookingsToShow.map(order => (
                            <div key={order.id} className="bg-[#0B132B] p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-lg text-white">{order.title}</p>
                                    <p className="text-sm text-gray-400">{getClientName(order.clientId)}</p>
                                </div>
                                <div className="text-end flex flex-col items-end">
                                    <p className="font-semibold text-yellow-400 mb-1">
                                        {scheduleView === 'week' 
                                            ? new Date(order.dateTime).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
                                            : new Date(order.dateTime).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => handleAddToCalendar(order)}
                                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                                            title={t('common.add_to_calendar')}
                                        >
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <button 
                                            onClick={() => openInGoogleMaps(order.location.lat, order.location.lng)}
                                            className="text-xs text-gray-500 hover:text-[#F7C873] transition-colors flex items-center gap-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {order.location.addressText || t('map_picker.unknown_location')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-4">{noBookingsMessage}</p>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
