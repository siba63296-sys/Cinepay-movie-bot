import React, { useState, useRef, useEffect } from 'react';
import { Order } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send, 
  Eye, 
  Check, 
  Filter, 
  ChevronDown, 
  RotateCcw,
  SlidersHorizontal 
} from 'lucide-react';

interface OrdersTabProps {
  orders: Order[];
  onRefreshData: () => void;
}

type OrderStatus = 'pending' | 'paid' | 'delivered' | 'cancelled';

export const OrdersTab: React.FC<OrdersTabProps> = ({ orders, onRefreshData }) => {
  // Multi-select state: allows selecting any combination of pending, paid, delivered, cancelled
  const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>(['pending', 'paid', 'delivered']);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Payment not received');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter orders by active multi-selected statuses
  const filteredOrders = orders.filter(o => {
    if (selectedStatuses.length === 0) return true;
    return selectedStatuses.includes(o.status as OrderStatus);
  });

  // Toggle single status in multi-select set
  const toggleStatus = (status: OrderStatus) => {
    setSelectedStatuses(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  const selectAll = () => {
    setSelectedStatuses(['pending', 'paid', 'delivered', 'cancelled']);
  };

  const selectPendingPaidOnly = () => {
    setSelectedStatuses(['pending', 'paid']);
  };

  const selectDeliveredOnly = () => {
    setSelectedStatuses(['delivered']);
  };

  const clearAll = () => {
    setSelectedStatuses([]);
  };

  const handleVerifyAndDeliver = async (order: Order) => {
    if (order.status === 'delivered') return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/orders/${order.order_code}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: 'Verified via Orders Dashboard' })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Order ${order.order_code} verified! Movie link dispatched to customer.`);
        onRefreshData();
        if (selectedOrder?.order_code === order.order_code) {
          setSelectedOrder(data.order);
        }
      } else {
        setActionMessage(`Failed: ${data.error}`);
      }
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    setActionLoading(true);

    try {
      await fetch(`/api/orders/${cancellingOrder.order_code}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason })
      });
      setCancellingOrder(null);
      onRefreshData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Status counts helper
  const countPending = orders.filter(o => o.status === 'pending').length;
  const countPaid = orders.filter(o => o.status === 'paid').length;
  const countDelivered = orders.filter(o => o.status === 'delivered').length;
  const countCancelled = orders.filter(o => o.status === 'cancelled').length;

  return (
    <div className="space-y-6">
      {/* Header & Multi-Select Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Orders & Payment Verification</h2>
          <p className="text-xs text-neutral-400">
            Manual UPI receipt verification & automatic Telegram movie link dispatch ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Multi-Select Filter Dropdown Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                isDropdownOpen || selectedStatuses.length > 0
                  ? 'bg-neutral-900 border-amber-500/50 text-amber-400'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Status</span>
              <span className="px-1.5 py-0.2 bg-neutral-800 text-white rounded text-[10px] font-mono tabular-nums">
                {selectedStatuses.length === 0 ? 'All' : selectedStatuses.length}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl p-3 z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-xs font-semibold text-white">Filter by Status</span>
                  <button
                    onClick={selectAll}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    Select All
                  </button>
                </div>

                {/* Multi-Select Checkbox Options */}
                <div className="space-y-1.5 text-xs">
                  {/* Pending Checkbox */}
                  <label
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-800/60 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleStatus('pending');
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        selectedStatuses.includes('pending')
                          ? 'bg-amber-400 border-amber-400 text-neutral-950'
                          : 'border-neutral-700 bg-neutral-950'
                      }`}>
                        {selectedStatuses.includes('pending') && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-neutral-200">Pending UPI</span>
                    </div>
                    <span className="font-mono text-[11px] text-amber-400 tabular-nums">
                      ({countPending})
                    </span>
                  </label>

                  {/* Paid Checkbox */}
                  <label
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-800/60 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleStatus('paid');
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        selectedStatuses.includes('paid')
                          ? 'bg-sky-400 border-sky-400 text-neutral-950'
                          : 'border-neutral-700 bg-neutral-950'
                      }`}>
                        {selectedStatuses.includes('paid') && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-neutral-200">Paid (Awaiting Dispatch)</span>
                    </div>
                    <span className="font-mono text-[11px] text-sky-400 tabular-nums">
                      ({countPaid})
                    </span>
                  </label>

                  {/* Delivered Checkbox */}
                  <label
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-800/60 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleStatus('delivered');
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        selectedStatuses.includes('delivered')
                          ? 'bg-emerald-400 border-emerald-400 text-neutral-950'
                          : 'border-neutral-700 bg-neutral-950'
                      }`}>
                        {selectedStatuses.includes('delivered') && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-neutral-200">Delivered</span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-400 tabular-nums">
                      ({countDelivered})
                    </span>
                  </label>

                  {/* Cancelled Checkbox */}
                  <label
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-800/60 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleStatus('cancelled');
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        selectedStatuses.includes('cancelled')
                          ? 'bg-rose-400 border-rose-400 text-neutral-950'
                          : 'border-neutral-700 bg-neutral-950'
                      }`}>
                        {selectedStatuses.includes('cancelled') && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-neutral-200">Cancelled</span>
                    </div>
                    <span className="font-mono text-[11px] text-rose-400 tabular-nums">
                      ({countCancelled})
                    </span>
                  </label>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px]">
                  <button
                    onClick={selectPendingPaidOnly}
                    className="text-neutral-400 hover:text-amber-400 transition-colors"
                  >
                    Pending & Paid
                  </button>
                  <button
                    onClick={selectDeliveredOnly}
                    className="text-neutral-400 hover:text-emerald-400 transition-colors"
                  >
                    Delivered Only
                  </button>
                  <button
                    onClick={clearAll}
                    className="text-neutral-500 hover:text-rose-400 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick 1-Click Multi-Select Toggle Badges */}
          <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs">
            <button
              onClick={() => toggleStatus('pending')}
              className={`flex items-center gap-1.5 px-2.5 py-1 font-medium rounded transition-colors ${
                selectedStatuses.includes('pending')
                  ? 'bg-amber-400/20 text-amber-400 border border-amber-500/40'
                  : 'text-neutral-400 hover:text-white border border-transparent'
              }`}
            >
              <span>Pending</span>
              <span className="font-mono tabular-nums text-[10px]">({countPending})</span>
            </button>

            <button
              onClick={() => toggleStatus('paid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 font-medium rounded transition-colors ${
                selectedStatuses.includes('paid')
                  ? 'bg-sky-400/20 text-sky-400 border border-sky-500/40'
                  : 'text-neutral-400 hover:text-white border border-transparent'
              }`}
            >
              <span>Paid</span>
              <span className="font-mono tabular-nums text-[10px]">({countPaid})</span>
            </button>

            <button
              onClick={() => toggleStatus('delivered')}
              className={`flex items-center gap-1.5 px-2.5 py-1 font-medium rounded transition-colors ${
                selectedStatuses.includes('delivered')
                  ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-neutral-400 hover:text-white border border-transparent'
              }`}
            >
              <span>Delivered</span>
              <span className="font-mono tabular-nums text-[10px]">({countDelivered})</span>
            </button>

            <button
              onClick={() => toggleStatus('cancelled')}
              className={`flex items-center gap-1.5 px-2.5 py-1 font-medium rounded transition-colors ${
                selectedStatuses.includes('cancelled')
                  ? 'bg-rose-400/20 text-rose-400 border border-rose-500/40'
                  : 'text-neutral-400 hover:text-white border border-transparent'
              }`}
            >
              <span>Cancelled</span>
              <span className="font-mono tabular-nums text-[10px]">({countCancelled})</span>
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-neutral-900 border border-amber-500/40 text-amber-300 text-xs rounded-xl flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-neutral-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 font-medium">
              <tr>
                <th className="py-3 px-4">Order Code</th>
                <th className="py-3 px-4">Movie</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Proof / UTR</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    {selectedStatuses.length === 0 ? (
                      <div>
                        <p>No statuses selected in filter.</p>
                        <button
                          onClick={selectAll}
                          className="mt-2 text-xs text-amber-400 hover:underline"
                        >
                          Select All Statuses
                        </button>
                      </div>
                    ) : (
                      'No orders found matching selected filter criteria.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isDelivered = ord.status === 'delivered';
                  const isPending = ord.status === 'pending';
                  const isPaid = ord.status === 'paid';
                  const isCancelled = ord.status === 'cancelled';

                  return (
                    <tr key={ord.id} className="hover:bg-neutral-900/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-white">
                        {ord.order_code}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                        {ord.movie_title || 'Movie'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-white font-medium">{ord.customer_name || 'Customer'}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          ID: {ord.customer_telegram_id}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-amber-400 font-semibold text-sm">
                        ₹{ord.amount}
                      </td>
                      <td className="py-3.5 px-4">
                        {isDelivered && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Delivered</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending UPI</span>
                          </span>
                        )}
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 text-sky-400 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            <span>Paid (Awaiting Send)</span>
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancelled</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-400 max-w-xs truncate">
                        {ord.customer_notes || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
                            title="View full order details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {(isPending || isPaid) && (
                            <>
                              <button
                                onClick={() => handleVerifyAndDeliver(ord)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded text-[11px] transition-colors"
                              >
                                {isPaid ? 'Deliver Video' : 'Verify & Send'}
                              </button>
                              <button
                                onClick={() => setCancellingOrder(ord)}
                                className="px-2 py-1 text-rose-400 hover:text-rose-300 rounded text-[11px] transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Order Details</h3>
              <span className="font-mono text-xs text-amber-400">{selectedOrder.order_code}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Movie:</span>
                  <span className="text-white font-medium">{selectedOrder.movie_title || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Amount:</span>
                  <span className="text-amber-400 font-mono font-semibold">₹{selectedOrder.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status:</span>
                  <span className="text-white uppercase font-medium">{selectedOrder.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Customer Telegram ID:</span>
                  <span className="font-mono text-white">{selectedOrder.customer_telegram_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Created At:</span>
                  <span className="text-neutral-300">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                </div>
                {selectedOrder.delivered_at && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Delivered At:</span>
                    <span className="text-emerald-400 font-mono">{new Date(selectedOrder.delivered_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                <div className="text-neutral-400 mb-1 font-medium">Customer Payment Proof / UTR:</div>
                <div className="text-white font-mono text-[11px]">
                  {selectedOrder.customer_notes || 'No payment note submitted'}
                </div>
              </div>

              {selectedOrder.admin_notes && (
                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                  <div className="text-neutral-400 mb-1 font-medium">Admin Notes:</div>
                  <div className="text-emerald-400 font-mono text-[11px]">{selectedOrder.admin_notes}</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-neutral-800">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
              >
                Close
              </button>
              {(selectedOrder.status === 'pending' || selectedOrder.status === 'paid') && (
                <button
                  onClick={() => handleVerifyAndDeliver(selectedOrder)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-lg"
                >
                  Verify & Deliver Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2">Cancel Customer Order</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Are you sure you want to cancel order <b className="text-white">{cancellingOrder.order_code}</b>?
            </p>
            <div className="mb-4">
              <label className="block text-neutral-400 text-xs mb-1">Reason for Cancellation</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setCancellingOrder(null)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
              >
                Back
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
