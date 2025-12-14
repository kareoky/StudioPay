

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface Order {
  id:string;
  clientId: string;
  title: string;
  servicePackage: {
    name: string;
    description: string;
  };
  priceAmount: number;
  depositPaid: number;
  balanceDue: number;
  dateTime: string;
  duration: number; // in minutes
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  location: {
    lat: number;
    lng: number;
    addressText: string;
  };
  notes?: string;
}

export enum View {
  Dashboard = 'dashboard',
  Clients = 'clients',
  Orders = 'orders',
  Calendar = 'calendar',
  AddEditOrder = 'addEditOrder',
  AddEditClient = 'addEditClient',
  Settings = 'settings',
}
