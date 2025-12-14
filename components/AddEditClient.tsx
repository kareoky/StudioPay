import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { useLanguage } from '../useLanguage';

interface AddEditClientProps {
    client: Client | null;
    onSave: (client: Client) => void;
    onCancel: () => void;
}

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
            className="w-full bg-[#2A3450] border border-gray-600 text-white rounded-md p-2 focus:ring-[#F7C873] focus:border-[#F7C873]"
            {...props}
        />
    </div>
);

const AddEditClient: React.FC<AddEditClientProps> = ({ client, onSave, onCancel }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<Client | null>(null);

    useEffect(() => {
        setFormData(client);
    }, [client]);

    if (!formData) return <div>{t('add_order.loading')}</div>;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            onSave(formData);
        }
    };

    return (
        <div className="max-w-lg mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">
                {client?.id.startsWith('new-') ? t('add_client.title.new') : t('add_client.title.edit')}
            </h1>
            
            <form onSubmit={handleSubmit} className="bg-[#1C2541] p-8 rounded-xl shadow-lg space-y-6">
                <InputField
                    label={t('add_client.form.name')}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
                <InputField
                    label={t('add_client.form.phone')}
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                />
                <InputField
                    label={t('add_client.form.email')}
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                />

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-500 transition-colors">
                        {t('common.cancel')}
                    </button>
                    <button type="submit" className="bg-[#F7C873] text-[#0B132B] font-bold py-2 px-6 rounded-lg hover:bg-yellow-400 transition-colors">
                        {t('common.save')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddEditClient;
