
import React, { useState, useEffect, useRef, useCallback } from 'react';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import ClientsList from './components/ClientsList';
import OrdersList from './components/OrdersList';
import CalendarView from './components/CalendarView';
import AddEditOrder from './components/AddEditOrder';
import AddEditClient from './components/AddEditClient';
import Settings from './components/Settings';
import { initialClients, initialOrders } from './constants';
import { Client, Order, View } from './types';
import PinLockScreen from './components/PinLockScreen';
import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import SplashScreen from './components/SplashScreen';


const App: React.FC = () => {
  const [view, setView] = useState<View>(View.Dashboard);
  const [showSplash, setShowSplash] = useState(true);
  
  // --- User Login State ---
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem('userName') || null;
  });

  const handleLogin = (name: string) => {
    localStorage.setItem('userName', name);
    setUserName(name);
  };
  // --- End User Login State ---

  // --- Splash Screen Effect ---
  useEffect(() => {
    const timer = setTimeout(() => {
        setShowSplash(false);
    }, 5000); // Show splash for 5 seconds
    return () => clearTimeout(timer);
  }, []);

  // --- Data Persistence Logic ---
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const savedClients = localStorage.getItem('clients');
      return savedClients ? JSON.parse(savedClients) : initialClients;
    } catch (error) {
      console.error("Failed to parse clients from localStorage", error);
      return initialClients;
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const savedOrders = localStorage.getItem('orders');
      return savedOrders ? JSON.parse(savedOrders) : initialOrders;
    } catch (error) {
      console.error("Failed to parse orders from localStorage", error);
      return initialOrders;
    }
  });

  useEffect(() => {
    if (userName) {
        localStorage.setItem('clients', JSON.stringify(clients));
    }
  }, [clients, userName]);

  useEffect(() => {
    if (userName) {
        localStorage.setItem('orders', JSON.stringify(orders));
    }
  }, [orders, userName]);
  // --- End of Data Persistence Logic ---


  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // --- PIN Lock & Device ID Feature (Annual Subscription) ---
  const [isLocked, setIsLocked] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  
  // Generate or Retrieve Device ID (Alphanumeric 8 chars)
  useEffect(() => {
    let storedDeviceId = localStorage.getItem('deviceId');
    if (!storedDeviceId) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
      let result = '';
      for (let i = 0; i < 8; i++) {
        if (i === 4) result += '-'; // Add dash for readability: XXXX-XXXX
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      storedDeviceId = result;
      localStorage.setItem('deviceId', storedDeviceId);
    }
    setDeviceId(storedDeviceId);
  }, []);

  // Check Subscription Status (Trial vs Annual)
  useEffect(() => {
    // 1. Check if Activated (Annual Subscription)
    const activationDateStr = localStorage.getItem('activationDate');
    const isLegacyActivated = localStorage.getItem('isActivated') === 'true';

    // Migration for legacy users: Set activation date to today if missing
    if (isLegacyActivated && !activationDateStr) {
        const today = new Date().toISOString();
        localStorage.setItem('activationDate', today);
    }

    const currentActivationDateStr = localStorage.getItem('activationDate');

    if (currentActivationDateStr) {
        const activationDate = new Date(currentActivationDateStr).getTime();
        const now = new Date().getTime();
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

        // Check if subscription expired
        if (now - activationDate < ONE_YEAR_MS) {
            setIsLocked(false);
            return; // Valid subscription
        } else {
             // Subscription expired!
             localStorage.removeItem('activationDate');
             localStorage.removeItem('isActivated'); 
        }
    }

    // 2. Check Trial Duration (7 Days)
    const FIRST_USE_KEY = 'firstUseTimestamp';
    const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
    
    const firstUseTimestampStr = localStorage.getItem(FIRST_USE_KEY);

    if (!firstUseTimestampStr) {
      // First time opening app: Set timestamp
      localStorage.setItem(FIRST_USE_KEY, new Date().toISOString());
    } else {
      // Return user: check difference
      const firstUseTime = new Date(firstUseTimestampStr).getTime();
      const now = new Date().getTime();
      
      if (now - firstUseTime > SEVEN_DAYS_IN_MS) {
        setIsLocked(true);
      }
    }
  }, []);

  const handleUnlock = (pin: string): boolean => {
    if (!deviceId) return false;

    // --- SECURITY ALGORITHM ---
    const SECRET_KEY = "StudioPay_Secure_Key_2024"; // Updated Key for rebrand
    const combined = deviceId + SECRET_KEY;
    
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    
    const expectedPin = Math.abs(hash).toString().slice(-4).padStart(4, '0');
    // --------------------------

    if (pin === expectedPin) {
      setIsLocked(false);
      // Set activation date for Annual Subscription
      localStorage.setItem('activationDate', new Date().toISOString());
      localStorage.setItem('isActivated', 'true'); // Keep for backward compatibility
      return true;
    }
    return false;
  };
  // --- End of PIN Lock Feature ---

  // --- Notification System ---
  // Load notification preference (default 8 hours)
  const [notifyLeadTime, setNotifyLeadTime] = useState<number>(() => {
      const saved = localStorage.getItem('notifyLeadTime');
      return saved ? parseInt(saved, 10) : 8;
  });

  const handleSetNotifyLeadTime = (hours: number) => {
      setNotifyLeadTime(hours);
      localStorage.setItem('notifyLeadTime', String(hours));
  };

  useEffect(() => {
    // Safety check: if Notification API is not supported, stop here
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
    }

    // Request permission on mount
    if (window.Notification.permission !== 'granted' && window.Notification.permission !== 'denied') {
        window.Notification.requestPermission();
    }

    const checkOrdersForNotification = () => {
        // Double check inside the interval function to avoid ReferenceError
        if (!('Notification' in window)) return;
        
        if (window.Notification.permission !== 'granted') return;

        const now = new Date().getTime();
        const LEAD_TIME_MS = notifyLeadTime * 60 * 60 * 1000;
        
        // Define a validity window for the notification.
        // We trigger if Now >= TargetTime.
        // But we stop trying if Now > TargetTime + 10 minutes (to avoid alerting for very old missed bookings when opening app).
        const NOTIFICATION_VALIDITY_WINDOW_MS = 10 * 60 * 1000; 

        orders.forEach(order => {
            if (order.status !== 'confirmed') return;

            const orderTime = new Date(order.dateTime).getTime();
            const triggerTime = orderTime - LEAD_TIME_MS;

            // Check if we have reached or passed the trigger time
            if (now >= triggerTime) {
                // Ensure we haven't passed the validity window (e.g. app was closed for days)
                if (now - triggerTime < NOTIFICATION_VALIDITY_WINDOW_MS) {
                    
                    const notificationKey = `notified-${order.id}-${notifyLeadTime}h`;
                    
                    // Check if we already sent this specific notification
                    if (!sessionStorage.getItem(notificationKey)) {
                        
                        // Send Notification Immediately
                        try {
                             new window.Notification("StudioPay Reminder", {
                                body: `Upcoming Session: ${order.title} in ${notifyLeadTime} hours.`,
                                icon: 'https://www.dropbox.com/scl/fi/zsipfindfzeonwxy4fbak/Untitled-design.png?rlkey=zjdlbedl61nwvy35zzn8b5rrq&st=5qvswo5v&raw=1',
                                tag: order.id, // Prevent duplicates by tag logic in OS
                                requireInteraction: true // Keep notification on screen until user interacts
                            });
                            sessionStorage.setItem(notificationKey, 'true');
                        } catch (e) {
                            console.error("Notification failed", e);
                        }
                    }
                }
            }
        });
    };

    // Check every 1 second (1000ms) for high precision
    const interval = setInterval(checkOrdersForNotification, 1000);
    return () => clearInterval(interval);

  }, [orders, notifyLeadTime]);
  // --- End Notification System ---

  const handleSaveOrder = (order: Order) => {
    if (order.id.startsWith('new-')) {
      setOrders(prev => [...prev, { ...order, id: `order-${Date.now()}` }]);
    } else {
      setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    }
    setView(View.Orders);
    setSelectedOrder(null);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setView(View.AddEditOrder);
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const handleAddNewOrder = () => {
    const newOrder: Order = {
        id: `new-${Date.now()}`,
        clientId: clients[0]?.id || 'client-1',
        title: '',
        servicePackage: { name: '', description: '' },
        priceAmount: 0,
        depositPaid: 0,
        get balanceDue() { return this.priceAmount - this.depositPaid; },
        dateTime: new Date().toISOString(),
        duration: 0,
        status: 'pending',
        location: { lat: 30.0444, lng: 31.2357, addressText: '' },
        notes: '',
    };
    setSelectedOrder(newOrder);
    setView(View.AddEditOrder);
  };

  const handleSaveClient = (client: Client) => {
    if (client.id.startsWith('new-')) {
      setClients(prev => [...prev, { ...client, id: `client-${Date.now()}` }]);
    } else {
      setClients(prev => prev.map(c => c.id === client.id ? client : c));
    }
    setView(View.Clients);
    setSelectedClient(null);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setView(View.AddEditClient);
  };

  const handleDeleteClient = (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
    setOrders(prev => prev.filter(o => o.clientId !== clientId));
  };
  
  const handleAddNewClient = () => {
    const newClient: Client = {
      id: `new-${Date.now()}`,
      name: '',
      phone: '',
      email: '',
    };
    setSelectedClient(newClient);
    setView(View.AddEditClient);
  };


  const renderView = () => {
    if (!userName) return null;

    switch (view) {
      case View.Dashboard:
        return <Dashboard userName={userName} orders={orders} clients={clients} setView={setView} onAddNewOrder={handleAddNewOrder} onAddNewClient={handleAddNewClient} />;
      case View.Clients:
        return <ClientsList clients={clients} orders={orders} onEditClient={handleEditClient} onAddNewClient={handleAddNewClient} onDeleteClient={handleDeleteClient} />;
      case View.Orders:
        return <OrdersList orders={orders} clients={clients} onEditOrder={handleEditOrder} onAddNewOrder={handleAddNewOrder} onDeleteOrder={handleDeleteOrder} />;
      case View.Calendar:
        return <CalendarView orders={orders} onOrderClick={handleEditOrder} />;
      case View.AddEditOrder:
        return <AddEditOrder order={selectedOrder} clients={clients} onSave={handleSaveOrder} onCancel={() => setView(View.Orders)} />;
      case View.AddEditClient:
        return <AddEditClient client={selectedClient} onSave={handleSaveClient} onCancel={() => setView(View.Clients)} />;
      case View.Settings:
        return <Settings orders={orders} onUnlock={handleUnlock} deviceId={deviceId} notifyLeadTime={notifyLeadTime} onSetNotifyLeadTime={handleSetNotifyLeadTime} />;
      default:
        return <Dashboard userName={userName} orders={orders} clients={clients} setView={setView} onAddNewOrder={handleAddNewOrder} onAddNewClient={handleAddNewClient}/>;
    }
  };

  if (showSplash) {
      return <SplashScreen />;
  }

  // 1. Check Annual Subscription Lock first (Highest Priority)
  if (isLocked) {
      return <PinLockScreen onUnlock={handleUnlock} deviceId={deviceId} />;
  }

  if (!userName) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-[#0B132B] text-white">
      <div className="hidden lg:flex">
        <Sidebar currentView={view} setView={setView} />
      </div>
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
          {renderView()}
        </main>
        <div className="lg:hidden">
            <BottomNav currentView={view} setView={setView} />
        </div>
      </div>
    </div>
  );
};

export default App;
