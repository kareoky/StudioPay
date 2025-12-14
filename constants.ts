
import { Client, Order } from './types';

export const initialClients: Client[] = [
  { id: 'client-1', name: 'أحمد محمود', phone: '01012345678', email: 'ahmed@example.com' },
  { id: 'client-2', name: 'فاطمة الزهراء', phone: '01198765432' },
  { id: 'client-3', name: 'محمد علي', phone: '01211223344', email: 'mohamed@example.com' },
];

export const initialOrders: Order[] = [
  {
    id: 'order-1',
    clientId: 'client-1',
    title: 'جلسة تصوير زفاف',
    servicePackage: { name: 'الباقة الذهبية', description: 'يوم كامل مع ألبوم صور' },
    priceAmount: 15000,
    depositPaid: 5000,
    get balanceDue() { return this.priceAmount - this.depositPaid; },
    dateTime: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
    duration: 480,
    status: 'confirmed',
    location: { lat: 29.9792, lng: 31.1342, addressText: 'أهرامات الجيزة' },
    notes: 'التصوير يشمل الأهل والأصدقاء المقربين فقط.'
  },
  {
    id: 'order-2',
    clientId: 'client-2',
    title: 'جلسة تصوير خطوبة',
    servicePackage: { name: 'باقة الخطوبة', description: '4 ساعات تصوير خارجي' },
    priceAmount: 6000,
    depositPaid: 2000,
    get balanceDue() { return this.priceAmount - this.depositPaid; },
    dateTime: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    duration: 240,
    status: 'completed',
    location: { lat: 30.0561, lng: 31.2394, addressText: 'حديقة الأزهر، القاهرة' },
  },
   {
    id: 'order-3',
    clientId: 'client-3',
    title: 'تصوير منتجات',
    servicePackage: { name: 'باقة الأعمال', description: 'تصوير 50 منتج' },
    priceAmount: 4500,
    depositPaid: 4500,
    get balanceDue() { return this.priceAmount - this.depositPaid; },
    dateTime: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
    duration: 180,
    status: 'completed',
    location: { lat: 30.0444, lng: 31.2357, addressText: 'ستوديو العميل، وسط البلد' },
  },
  {
    id: 'order-4',
    clientId: 'client-1',
    title: 'جلسة تصوير عائلية',
    servicePackage: { name: 'الباقة العائلية', description: 'ساعتان في حديقة' },
    priceAmount: 3000,
    depositPaid: 1000,
    get balanceDue() { return this.priceAmount - this.depositPaid; },
    dateTime: new Date().toISOString(), // Today
    duration: 120,
    status: 'confirmed',
    location: { lat: 30.0583, lng: 31.2289, addressText: 'حديقة الأورمان، الجيزة' },
    notes: 'التركيز على الأطفال.'
  },
  {
    id: 'order-5',
    clientId: 'client-2',
    title: 'عيد ميلاد',
    servicePackage: { name: 'باقة أعياد الميلاد', description: '3 ساعات تغطية' },
    priceAmount: 3500,
    depositPaid: 0,
    get balanceDue() { return this.priceAmount - this.depositPaid; },
    dateTime: new Date(new Date().setDate(new Date().getDate() + 12)).toISOString(),
    duration: 180,
    status: 'pending',
    location: { lat: 30.0770, lng: 31.2859, addressText: 'فيلا العميل، مصر الجديدة' },
  },
];
