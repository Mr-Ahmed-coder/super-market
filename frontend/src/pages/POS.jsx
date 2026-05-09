import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Barcode,
  Minus,
  Plus,
  Receipt,
  Search,
  Trash2
} from 'lucide-react';
import api from '../api/axios.js';
import CheckoutModal from '../components/CheckoutModal.jsx';
import ReceiptPreview from '../components/ReceiptPreview.jsx';
import { getCustomers } from '../services/customerService.js';
import { searchProducts } from '../services/productService.js';
import { getSettings } from '../services/settingsService.js';

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback;

function POS() {
  const searchInputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [error, setError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [receiptSale, setReceiptSale] = useState(null);

  const taxPercentage = Number(settings?.taxPercentage || 0);

  const subtotal = useMemo(
    () => roundMoney(cart.reduce((sum, item) => sum + item.quantity * Number(item.sellingPrice || 0), 0)),
    [cart]
  );

  const discountTotal = useMemo(() => {
    const requestedDiscount = Number(discount || 0);
    if (!Number.isFinite(requestedDiscount) || requestedDiscount < 0) {
      return 0;
    }

    return roundMoney(Math.min(requestedDiscount, subtotal));
  }, [discount, subtotal]);

  const taxableAmount = roundMoney(Math.max(subtotal - discountTotal, 0));
  const taxAmount = roundMoney((taxableAmount * taxPercentage) / 100);
  const grandTotal = roundMoney(taxableAmount + taxAmount);
  const parsedAmountPaid = Number(amountPaid || 0);
  const safeAmountPaid = Number.isFinite(parsedAmountPaid) && parsedAmountPaid > 0 ? roundMoney(parsedAmountPaid) : 0;
  const changeAmount = safeAmountPaid > grandTotal ? roundMoney(safeAmountPaid - grandTotal) : 0;
  const balance = safeAmountPaid < grandTotal ? roundMoney(grandTotal - safeAmountPaid) : 0;

  const totals = {
    subtotal,
    discountTotal,
    taxAmount,
    grandTotal,
    amountPaid: safeAmountPaid,
    changeAmount,
    balance
  };

  const selectedCustomer = customers.find((customer) => customer._id === selectedCustomerId) || null;
  const projectedCustomerBalance = selectedCustomer ? Number(selectedCustomer.currentBalance || 0) + balance : 0;
  const creditLimitExceeded =
    selectedCustomer && selectedCustomer.creditLimit > 0 && projectedCustomerBalance > selectedCustomer.creditLimit;

  const focusSearchInput = () => {
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  useEffect(() => {
    focusSearchInput();

    const loadSettings = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch {
        setSettings(null);
      }
    };

    const loadCustomers = async () => {
      try {
        const data = await getCustomers();
        setCustomers(data.filter((customer) => customer.isActive));
      } catch {
        setCustomers([]);
      }
    };

    loadSettings();
    loadCustomers();
  }, []);

  const addToCart = (product) => {
    setError('');
    setSuccessMessage('');
    setReceiptSale(null);

    if (!product.isActive) {
      setError('This product is inactive and cannot be sold.');
      focusSearchInput();
      return;
    }

    if (Number(product.stockQuantity) <= 0) {
      setError('This product is out of stock.');
      focusSearchInput();
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item._id === product._id);

      if (existingItem) {
        if (existingItem.quantity >= Number(product.stockQuantity)) {
          setError(`Only ${product.stockQuantity} available for ${product.name}.`);
          return currentCart;
        }

        return currentCart.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });

    setQuery('');
    setResults([]);
    focusSearchInput();
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      focusSearchInput();
      return;
    }

    setIsSearching(true);
    setError('');
    setSuccessMessage('');
    setReceiptSale(null);

    try {
      const products = await searchProducts(trimmedQuery);
      const activeProducts = products.filter((product) => product.isActive);
      const exactBarcodeMatch = activeProducts.find((product) => product.barcode === trimmedQuery);

      if (exactBarcodeMatch) {
        addToCart(exactBarcodeMatch);
        return;
      }

      setResults(activeProducts);

      if (activeProducts.length === 0) {
        setError('No active products found.');
      }
    } catch (requestError) {
      setResults([]);
      setError(getErrorMessage(requestError, 'Unable to search products.'));
    } finally {
      setIsSearching(false);
      focusSearchInput();
    }
  };

  const updateQuantity = (productId, nextQuantity) => {
    setError('');
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item._id !== productId) {
            return item;
          }

          const quantity = Math.max(0, Number(nextQuantity || 0));
          const limitedQuantity = Math.min(quantity, Number(item.stockQuantity));

          if (quantity > Number(item.stockQuantity)) {
            setError(`Only ${item.stockQuantity} available for ${item.name}.`);
          }

          return { ...item, quantity: limitedQuantity };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) => currentCart.filter((item) => item._id !== productId));
    focusSearchInput();
  };

  const clearCart = () => {
    setCart([]);
    setDiscount('');
    setAmountPaid('');
    setPaymentMethod('cash');
    setSelectedCustomerId('');
    setResults([]);
    setQuery('');
    focusSearchInput();
  };

  const openCheckout = () => {
    setCheckoutError('');
    setAmountPaid(grandTotal > 0 ? grandTotal.toFixed(2) : '');
    setIsCheckoutOpen(true);
  };

  const buildSaleItems = () => {
    if (subtotal <= 0) {
      return cart.map((item) => ({
        product: item._id,
        quantity: item.quantity,
        discount: 0
      }));
    }

    let remainingDiscount = discountTotal;

    return cart.map((item, index) => {
      const lineSubtotal = roundMoney(item.quantity * Number(item.sellingPrice || 0));
      const lineDiscount =
        index === cart.length - 1
          ? remainingDiscount
          : roundMoney((lineSubtotal / subtotal) * discountTotal);

      remainingDiscount = roundMoney(remainingDiscount - lineDiscount);

      return {
        product: item._id,
        quantity: item.quantity,
        discount: Math.min(lineDiscount, lineSubtotal)
      };
    });
  };

  const handleSubmitSale = async (event) => {
    event.preventDefault();
    setCheckoutError('');
    setSuccessMessage('');

    if (cart.length === 0) {
      setCheckoutError('Cart is empty.');
      return;
    }

    if (balance > 0 && !selectedCustomerId) {
      setCheckoutError('Select a customer before saving a credit sale.');
      return;
    }

    if (creditLimitExceeded) {
      setCheckoutError('Credit sale exceeds selected customer credit limit.');
      return;
    }

    const requestedDiscount = Number(discount || 0);
    if (!Number.isFinite(requestedDiscount) || requestedDiscount < 0) {
      setCheckoutError('Discount cannot be negative.');
      return;
    }

    if (requestedDiscount > subtotal) {
      setCheckoutError('Discount cannot be greater than subtotal.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/sales', {
        items: buildSaleItems(),
        amountPaid: safeAmountPaid,
        paymentMethod,
        customer: selectedCustomerId || null
      });

      const sale = response.data.data.sale;
      setSuccessMessage(`Sale completed successfully. Sale number: ${sale.saleNumber}`);
      setReceiptSale(sale);
      setIsCheckoutOpen(false);
      clearCart();
    } catch (requestError) {
      setCheckoutError(getErrorMessage(requestError, 'Unable to submit sale.'));
    } finally {
      setIsSubmitting(false);
      focusSearchInput();
    }
  };

  return (
    <div className="pos-page">
      <section className="pos-header">
        <div>
          <p className="eyebrow">Point of Sale</p>
          <h1>POS Checkout</h1>
        </div>
        <div className="pos-total-chip">
          <span>Total</span>
          <strong>{grandTotal.toFixed(2)}</strong>
        </div>
      </section>

      {successMessage && <div className="form-success">{successMessage}</div>}
      {error && <div className="form-error">{error}</div>}

      <div className="pos-layout">
        <section className="pos-search-panel">
          <form className="pos-search-form" onSubmit={handleSearch}>
            <label className="pos-search-label" htmlFor="pos-product-search">
              <Barcode size={24} />
              <span>Scan or search product</span>
            </label>
            <div className="pos-search-control">
              <Search size={24} />
              <input
                id="pos-product-search"
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Barcode or product name"
                autoComplete="off"
              />
              <button className="primary-button pos-search-button" type="submit" disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Add'}
              </button>
            </div>
          </form>

          <div className="pos-results">
            {results.map((product) => (
              <button
                className="pos-product-row"
                type="button"
                key={product._id}
                onClick={() => addToCart(product)}
              >
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.barcode || 'No barcode'}</small>
                </span>
                <span>
                  <strong>{Number(product.sellingPrice).toFixed(2)}</strong>
                  <small>Stock {product.stockQuantity}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="pos-cart-panel">
          <div className="pos-cart-header">
            <div>
              <p className="eyebrow">Cart</p>
              <h2>{cart.length} item{cart.length === 1 ? '' : 's'}</h2>
            </div>
            <button className="secondary-button" type="button" onClick={clearCart} disabled={cart.length === 0}>
              Clear
            </button>
          </div>

          <div className="table-scroll pos-cart-scroll">
            <table className="users-table pos-cart-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="5">Cart is empty.</td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.name}</strong>
                        <span className="table-subtext">{item.barcode || 'No barcode'}</span>
                      </td>
                      <td>{Number(item.sellingPrice).toFixed(2)}</td>
                      <td>
                        <div className="quantity-stepper">
                          <button type="button" onClick={() => updateQuantity(item._id, item.quantity - 1)}>
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.stockQuantity}
                            value={item.quantity}
                            onChange={(event) => updateQuantity(item._id, event.target.value)}
                          />
                          <button type="button" onClick={() => updateQuantity(item._id, item.quantity + 1)}>
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td>{roundMoney(item.quantity * Number(item.sellingPrice || 0)).toFixed(2)}</td>
                      <td>
                        <button
                          className="table-icon-button danger"
                          type="button"
                          onClick={() => removeFromCart(item._id)}
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pos-summary">
            <label className="input-group pos-customer-select">
              Customer
              <select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                <option value="">Walk-in customer</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name} {customer.phone ? `- ${customer.phone}` : ''}
                  </option>
                ))}
              </select>
              {selectedCustomer && (
                <span className={`pos-credit-hint ${creditLimitExceeded ? 'danger' : ''}`}>
                  Balance {Number(selectedCustomer.currentBalance || 0).toFixed(2)} / Limit {Number(selectedCustomer.creditLimit || 0).toFixed(2)}
                </span>
              )}
            </label>

            <label className="input-group">
              Discount
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                placeholder="0.00"
              />
            </label>

            <div className="pos-summary-lines">
              <div>
                <span>Subtotal</span>
                <strong>{subtotal.toFixed(2)}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong>{discountTotal.toFixed(2)}</strong>
              </div>
              <div>
                <span>Tax {taxPercentage > 0 ? `(${taxPercentage}%)` : ''}</span>
                <strong>{taxAmount.toFixed(2)}</strong>
              </div>
              <div className="pos-grand-total">
                <span>Grand Total</span>
                <strong>{grandTotal.toFixed(2)}</strong>
              </div>
            </div>

            <button
              className="primary-action-button pos-checkout-button"
              type="button"
              disabled={cart.length === 0}
              onClick={openCheckout}
            >
              <Receipt size={20} />
              <span>Checkout</span>
            </button>
          </div>
        </section>
      </div>

      {isCheckoutOpen && (
        <CheckoutModal
          totals={totals}
          amountPaid={amountPaid}
          paymentMethod={paymentMethod}
          isSubmitting={isSubmitting}
          error={checkoutError}
          onAmountPaidChange={setAmountPaid}
          onPaymentMethodChange={setPaymentMethod}
          onClose={() => setIsCheckoutOpen(false)}
          onSubmit={handleSubmitSale}
        />
      )}

      {receiptSale && (
        <ReceiptPreview
          sale={receiptSale}
          settings={settings}
          onClose={() => {
            setReceiptSale(null);
            focusSearchInput();
          }}
        />
      )}
    </div>
  );
}

export default POS;
