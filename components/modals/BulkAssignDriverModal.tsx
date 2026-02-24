
import React, { useState } from 'react';
import { User } from '../../types';
import { IconX, IconCalendar, IconUserPlus } from '../Icon';

interface BulkAssignDriverModalProps {
  packageCount: number;
  drivers: User[];
  onClose: () => void;
  onAssign: (driverId: string, newDeliveryDate: Date, autoOptimize: boolean) => void;
}

const formatDateForInput = (date: Date): string => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const BulkAssignDriverModal: React.FC<BulkAssignDriverModalProps> = ({ packageCount, drivers, onClose, onAssign }) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(formatDateForInput(new Date()));
  const [autoOptimize, setAutoOptimize] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) return;
    const [year, month, day] = deliveryDate.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    onAssign(selectedDriverId, localDate, autoOptimize);
  };

  const today = formatDateForInput(new Date());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-[var(--background-secondary)] rounded-xl shadow-2xl w-full max-w-md animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Asignación Masiva</h3>
          <button onClick={onClose} className="p-2 rounded-full text-[var(--text-muted)] hover:bg-[var(--background-hover)]" aria-label="Cerrar modal">
            <IconX className="w-6 h-6" />
          </button>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <p className="text-center font-semibold text-[var(--text-secondary)]">
              Vas a asignar <span className="text-[var(--brand-primary)] text-lg">{packageCount}</span> paquete(s) a un conductor.
            </p>
            <div>
              <label htmlFor="bulk-driver-select" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Conductor</label>
              <select id="bulk-driver-select" value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-[var(--border-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-secondary)] sm:text-sm rounded-md bg-[var(--background-secondary)] text-[var(--text-primary)]">
                <option value="" disabled>-- Seleccionar Conductor --</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>{driver.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bulk-delivery-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Fecha de Entrega</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IconCalendar className="h-5 w-5 text-[var(--text-muted)]" /></div>
                <input type="date" id="bulk-delivery-date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} min={today} required className="mt-1 block w-full pl-10 pr-3 py-2 text-base border-[var(--border-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-secondary)] sm:text-sm rounded-md bg-[var(--background-secondary)] text-[var(--text-primary)]" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <input
                type="checkbox"
                id="auto-optimize"
                checked={autoOptimize}
                onChange={(e) => setAutoOptimize(e.target.checked)}
                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="auto-optimize" className="text-sm font-medium text-indigo-900 cursor-pointer">
                Optimizar ruta automáticamente al asignar
              </label>
            </div>
          </div>
          <footer className="px-6 py-4 bg-[var(--background-muted)] rounded-b-xl flex justify-end">
            <button type="submit" className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[var(--brand-primary)] border border-transparent rounded-md shadow-sm hover:bg-[var(--brand-secondary)]">
              <IconUserPlus className="w-5 h-5 mr-2" />
              Asignar Paquetes
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
export default BulkAssignDriverModal;
