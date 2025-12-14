import React from 'react';
import { Client, Order } from '../types';
import { useLanguage } from '../useLanguage';

interface ClientsListProps {
  clients: Client[];
  orders: Order[];
  onEditClient: (client: Client) => void;
  onAddNewClient: () => void;
  onDeleteClient: (clientId: string) => void;
}

const ClientsList: React.FC<ClientsListProps> = ({ clients, orders, onEditClient, onAddNewClient, onDeleteClient }) => {
  const { t } = useLanguage();
  
  const getClientOrderCount = (clientId: string) => {
    return orders.filter(order => order.clientId === clientId).length;
  };

  const handleDelete = (clientId: string) => {
    if (window.confirm(t('clients.delete_confirm'))) {
      onDeleteClient(clientId);
    }
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">{t('clients.title')}</h1>
            <button
                onClick={onAddNewClient}
                className="bg-[#F7C873] text-[#0B132B] font-bold py-2 px-4 rounded-lg flex items-center hover:bg-yellow-400 transition-colors duration-200"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                {t('clients.new_client')}
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map(client => (
                <div key={client.id} className="bg-[#1C2541] p-6 rounded-xl shadow-lg hover:shadow-yellow-500/20 hover:border-yellow-500 border border-transparent transition-all duration-300 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center mb-4">
                            <div className="w-12 h-12 rounded-full bg-[#0B132B] flex-shrink-0 flex items-center justify-center text-[#F7C873] font-bold text-xl me-4">
                                {client.name.charAt(0)}
                            </div>
                            <div className="flex-grow">
                                <h2 className="text-xl font-bold text-white truncate">{client.name}</h2>
                                <a href={`tel:${client.phone}`} className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1.5 mt-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span>{client.phone}</span>
                                </a>
                            </div>
                        </div>
                        {client.email && (
                             <a href={`mailto:${client.email}`} className="text-sm text-gray-400 -mt-2 mb-4 hover:text-white transition-colors duration-200 flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                                <span>{client.email}</span>
                            </a>
                        )}
                    </div>
                    <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
                        <span className="text-gray-300">{t('clients.total_bookings')}</span>
                        <span className="text-lg font-bold text-[#F7C873]">{getClientOrderCount(client.id)}</span>
                    </div>
                     <div className="mt-4 text-end">
                        <button onClick={() => onEditClient(client)} className="text-sm text-[#F7C873] hover:text-yellow-300 font-semibold">
                           {t('clients.edit')}
                        </button>
                        <button onClick={() => handleDelete(client.id)} className="text-sm text-red-500 hover:text-red-400 font-semibold ms-4">
                           {t('common.delete')}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default ClientsList;