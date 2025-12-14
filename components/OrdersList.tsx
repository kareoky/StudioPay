
import React from 'react';
import { Order, Client } from '../types';
import { useLanguage } from '../useLanguage';

interface OrdersListProps {
  orders: Order[];
  clients: Client[];
  onEditOrder: (order: Order) => void;
  onAddNewOrder: () => void;
  onDeleteOrder: (orderId: string) => void;
}

const statusStyles: { [key in Order['status']]: string } = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    confirmed: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-red-500/20 text-red-400',
};

const OrdersList: React.FC<OrdersListProps> = ({ orders, clients, onEditOrder, onAddNewOrder, onDeleteOrder }) => {
    const { t, language } = useLanguage();
    
    const statusText: { [key in Order['status']]: string } = {
        pending: t('orders.status.pending'),
        confirmed: t('orders.status.confirmed'),
        completed: t('orders.status.completed'),
        cancelled: t('orders.status.cancelled'),
    };

    const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || t('common.unknown_client');
  
    const formatCurrency = (amount: number) => new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 }).format(amount);

    // Sort Logic:
    // 1. Split into "Upcoming/Today" and "Past".
    // 2. Upcoming: Sort Ascending (Earliest date/time first).
    // 3. Past: Sort Descending (Most recent date/time first).
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const splitTime = todayStart.getTime();

    // Helper to safely get time
    const getTime = (dateStr: string) => new Date(dateStr).getTime();
    
    const upcomingOrders = orders
        .filter(o => getTime(o.dateTime) >= splitTime)
        .sort((a, b) => getTime(a.dateTime) - getTime(b.dateTime));

    const pastOrders = orders
        .filter(o => getTime(o.dateTime) < splitTime)
        .sort((a, b) => getTime(b.dateTime) - getTime(a.dateTime));
        
    const sortedOrders = [...upcomingOrders, ...pastOrders];

    const handleDelete = (orderId: string) => {
        if (window.confirm(t('orders.delete_confirm'))) {
            onDeleteOrder(orderId);
        }
    };

    const openInGoogleMaps = (e: React.MouseEvent, lat: number, lng: number) => {
        e.stopPropagation();
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank');
    };

    const handleAddToCalendar = (e: React.MouseEvent, order: Order) => {
        e.stopPropagation();
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
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">{t('orders.title')}</h1>
            <button
                onClick={onAddNewOrder}
                className="bg-[#F7C873] text-[#0B132B] font-bold py-2 px-4 rounded-lg flex items-center hover:bg-yellow-400 transition-colors duration-200"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                {t('orders.new_booking')}
            </button>
        </div>

        <div className="bg-[#1C2541] rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-start">
                    <thead className="bg-[#0B132B]">
                        <tr>
                            <th className="p-4 font-semibold text-sm text-gray-300">{t('orders.table.title')}</th>
                            <th className="p-4 font-semibold text-sm text-gray-300">{t('orders.table.client')}</th>
                            <th className="p-4 font-semibold text-sm text-gray-300">{t('orders.table.datetime')}</th>
                            <th className="p-4 font-semibold text-sm text-gray-300">{t('orders.table.price')}</th>
                            <th className="p-4 font-semibold text-sm text-gray-300">{t('orders.table.status')}</th>
                            <th className="p-4 font-semibold text-sm text-gray-300 text-center">{t('add_order.form.location')}</th>
                            <th className="p-4 font-semibold text-sm text-gray-300">{t('orders.table.action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedOrders.map((order, index) => (
                            <tr key={order.id} className={`border-t border-gray-700 ${index % 2 === 0 ? 'bg-[#1C2541]' : 'bg-[#2A3450]'}`}>
                                <td className="p-4 text-white font-medium">{order.title}</td>
                                <td className="p-4 text-gray-300">{getClientName(order.clientId)}</td>
                                <td className="p-4 text-gray-300" dir="ltr">
                                    {new Date(order.dateTime).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="p-4 text-green-400 font-semibold">{formatCurrency(order.priceAmount)}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusStyles[order.status]}`}>
                                        {statusText[order.status]}
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={(e) => openInGoogleMaps(e, order.location.lat, order.location.lng)}
                                        className="text-[#F7C873] hover:text-white transition-colors"
                                        title={order.location.addressText}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                </td>
                                <td className="p-4 flex items-center gap-3">
                                    <button onClick={(e) => handleAddToCalendar(e, order)} className="text-blue-400 hover:text-blue-300" title={t('common.add_to_calendar')}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                    <button onClick={() => onEditOrder(order)} className="text-[#F7C873] hover:text-yellow-300 font-semibold">{t('orders.edit')}</button>
                                    <button onClick={() => handleDelete(order.id)} className="text-red-500 hover:text-red-400 font-semibold">{t('common.delete')}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default OrdersList;
