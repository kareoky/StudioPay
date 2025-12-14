
import React, { useState, useEffect } from 'react';
import { Order, Client } from '../types';
import { useLanguage } from '../useLanguage';
import MapPickerModal from './MapPickerModal';

interface AddEditOrderProps {
    order: Order | null;
    clients: Client[];
    onSave: (order: Order) => void;
    onCancel: () => void;
}

// A type for the form state to handle empty strings for number fields and duration in hours
type OrderFormState = Omit<Order, 'priceAmount' | 'depositPaid' | 'duration' | 'balanceDue' | 'notes'> & {
    priceAmount: string;
    depositPaid: string;
    duration: string; // in hours
    notes?: string;
};


const InputField: React.FC<{label: string, value: string | number, name: string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void, type?: string, required?: boolean, inputMode?: "text" | "none" | "tel" | "url" | "email" | "numeric" | "decimal" | "search", dir?: string, children?: React.ReactNode}> = ({ label, type = 'text', children, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        {type === 'select' ? (
            <select className="w-full bg-[#2A3450] border border-gray-600 text-white rounded-md p-2 focus:ring-[#F7C873] focus:border-[#F7C873]" {...props}>
                {children}
            </select>
        ) : type === 'textarea' ? (
             <textarea rows={3} className="w-full bg-[#2A3450] border border-gray-600 text-white rounded-md p-2 focus:ring-[#F7C873] focus:border-[#F7C873]" {...props} />
        ) : (
            <input type={type} className="w-full bg-[#2A3450] border border-gray-600 text-white rounded-md p-2 focus:ring-[#F7C873] focus:border-[#F7C873]" {...props} />
        )}
    </div>
);

const AddEditOrder: React.FC<AddEditOrderProps> = ({ order, clients, onSave, onCancel }) => {
    const { t, language } = useLanguage();
    const [formData, setFormData] = useState<OrderFormState | null>(null);
    const [isMapOpen, setIsMapOpen] = useState(false);

    useEffect(() => {
        if (order) {
            const isNew = order.id.startsWith('new-');

            // Convert stored ISO string (UTC) to a local datetime-local input string
            const dateForInput = new Date(order.dateTime);
            const year = dateForInput.getFullYear();
            const month = String(dateForInput.getMonth() + 1).padStart(2, '0');
            const day = String(dateForInput.getDate()).padStart(2, '0');
            const hours = String(dateForInput.getHours()).padStart(2, '0');
            const minutes = String(dateForInput.getMinutes()).padStart(2, '0');
            const formattedLocalDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            
            setFormData({
                ...order,
                dateTime: formattedLocalDateTime,
                priceAmount: isNew && order.priceAmount === 0 ? '' : String(order.priceAmount),
                depositPaid: isNew && order.depositPaid === 0 ? '' : String(order.depositPaid),
                duration: isNew && order.duration === 0 ? '' : String(order.duration / 60), // Convert minutes to hours
            });
        }
    }, [order]);

    if (!formData) return <div>{t('add_order.loading')}</div>;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            if (!prev) return null;
            return { ...prev, [name]: value };
        });
    };

    const handlePackageChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, servicePackage: { ...prev.servicePackage, [name]: value } } : null);
    };

    const handleLocationSelect = (location: Order['location']) => {
        setFormData(prev => prev ? { ...prev, location } : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(formData) {
             // Convert the form state back to a valid Order object for saving
            const priceAmount = parseFloat(formData.priceAmount) || 0;
            const depositPaid = parseFloat(formData.depositPaid) || 0;

            const orderToSave: Order = {
                ...formData,
                priceAmount,
                depositPaid,
                balanceDue: priceAmount - depositPaid,
                duration: Math.round((parseFloat(formData.duration) || 0) * 60), // Convert hours back to minutes
                dateTime: new Date(formData.dateTime).toISOString(),
                notes: formData.notes || '',
            };
            onSave(orderToSave);
        }
    };
    
    const openGoogleMapsNavigation = () => {
        if (formData && formData.location && formData.location.lat && formData.location.lng) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${formData.location.lat},${formData.location.lng}`;
            window.open(url, '_blank');
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <h1 className="text-3xl font-bold text-white mb-6">{order?.id.startsWith('new-') ? t('add_order.title.new') : t('add_order.title.edit')}</h1>
            
            <form onSubmit={handleSubmit} className="bg-[#1C2541] p-8 rounded-xl shadow-lg space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField label={t('add_order.form.session_title')} name="title" value={formData.title} onChange={handleChange} required />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">{t('add_order.form.client')}</label>
                        <select name="clientId" value={formData.clientId} onChange={handleChange} className="w-full bg-[#2A3450] border border-gray-600 text-white rounded-md p-2 focus:ring-[#F7C873] focus:border-[#F7C873]">
                            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                        </select>
                    </div>

                    <InputField label={t('add_order.form.package_name')} name="name" value={formData.servicePackage.name} onChange={handlePackageChange} />
                    <InputField label={t('add_order.form.package_description')} name="description" value={formData.servicePackage.description} onChange={handlePackageChange} />

                    <InputField 
                        label={t('add_order.form.total_price')} 
                        type="number" 
                        inputMode="decimal" 
                        dir="ltr"
                        name="priceAmount" 
                        value={formData.priceAmount} 
                        onChange={handleChange} 
                    />
                    <InputField 
                        label={t('add_order.form.deposit_paid')} 
                        type="number" 
                        inputMode="decimal" 
                        dir="ltr"
                        name="depositPaid" 
                        value={formData.depositPaid} 
                        onChange={handleChange} 
                    />
                    
                    <InputField label={t('add_order.form.datetime')} type="datetime-local" name="dateTime" value={formData.dateTime} onChange={handleChange} />
                    <InputField 
                        label={t('add_order.form.duration')} 
                        type="number" 
                        inputMode="decimal"
                        dir="ltr" 
                        name="duration" 
                        value={formData.duration} 
                        onChange={handleChange} 
                    />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">{t('add_order.form.location')}</label>
                        <div className="flex flex-col gap-2">
                             <div className="relative">
                                <input 
                                    type="text"
                                    name="addressText"
                                    value={formData.location.addressText}
                                    onChange={(e) => setFormData(prev => prev ? {...prev, location: {...prev.location, addressText: e.target.value}} : null)}
                                    className="w-full bg-[#2A3450] border border-gray-600 text-white rounded-md p-2 pl-10 focus:ring-[#F7C873] focus:border-[#F7C873]"
                                    placeholder="Enter address manually or pick from map"
                                />
                                <div className="absolute left-3 top-2.5 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                             </div>
                            
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setIsMapOpen(true)}
                                    className="flex-grow bg-[#0B132B] text-[#F7C873] border border-[#F7C873] py-2 px-4 rounded-md hover:bg-[#F7C873] hover:text-[#0B132B] transition-colors flex items-center justify-center gap-2 font-medium"
                                    title={t('add_order.form.pick_map')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                    <span>{t('add_order.form.pick_map')}</span>
                                </button>

                                {formData.location.lat !== 0 && (
                                     <button 
                                        type="button"
                                        onClick={openGoogleMapsNavigation}
                                        className="bg-blue-600 text-white border border-blue-600 py-2 px-4 rounded-md hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 font-medium"
                                        title="Navigate"
                                    >
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform -rotate-45" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">{t('add_order.form.status')}</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-[#2A3450] border border-gray-600 text-white rounded-md p-2 focus:ring-[#F7C873] focus:border-[#F7C873]">
                            <option value="pending">{t('orders.status.pending')}</option>
                            <option value="confirmed">{t('orders.status.confirmed')}</option>
                            <option value="completed">{t('orders.status.completed')}</option>
                            <option value="cancelled">{t('orders.status.cancelled')}</option>
                        </select>
                    </div>

                </div>
                
                 <InputField label={t('add_order.form.notes')} name="notes" value={formData.notes || ''} onChange={handleChange} type="textarea" />

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-500 transition-colors">{t('common.cancel')}</button>
                    <button type="submit" className="bg-[#F7C873] text-[#0B132B] font-bold py-2 px-6 rounded-lg hover:bg-yellow-400 transition-colors">{t('common.save')}</button>
                </div>
            </form>
            
            {/* Map Modal */}
            <MapPickerModal
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onLocationSelect={handleLocationSelect}
                initialLocation={formData.location}
            />
        </div>
    );
};

export default AddEditOrder;
