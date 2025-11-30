import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CustomerDashboard from './pages/customer/Dashboard';
import MenuList from './pages/customer/MenuList';
import Cart from './pages/customer/Cart';
import OrderInfo from './pages/customer/OrderInfo';
import OrderComplete from './pages/customer/OrderComplete';
import VoiceOrder from './pages/customer/VoiceOrder';
import OrderHistory from './pages/customer/OrderHistory';
import MyPage from './pages/customer/MyPage';
import EditProfile from './pages/customer/EditProfile';
import AddressManagement from './pages/customer/AddressManagement';
import PaymentManagement from './pages/customer/PaymentManagement';
import StaffDashboard from './pages/staff/Dashboard';
import OrderList from './pages/staff/OrderList';
import InventoryList from './pages/staff/InventoryList';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Customer Routes */}
            <Route path="/customer" element={<CustomerDashboard />}>
              <Route index element={<Navigate to="/customer/menu" replace />} />
              <Route path="menu" element={<MenuList />} />
              <Route path="cart" element={<Cart />} />
              <Route path="order-info" element={<OrderInfo />} />
              <Route path="order-complete" element={<OrderComplete />} />
              <Route path="voice-order" element={<VoiceOrder />} />
              <Route path="order-history" element={<OrderHistory />} />
              <Route path="mypage" element={<MyPage />} />
              <Route path="edit-profile" element={<EditProfile />} />
              <Route path="address-management" element={<AddressManagement />} />
              <Route path="payment-management" element={<PaymentManagement />} />
            </Route>

            {/* Staff Routes */}
            <Route path="/staff" element={<StaffDashboard />}>
              <Route index element={<Navigate to="/staff/orders" replace />} />
              <Route path="orders" element={<OrderList />} />
              <Route path="inventory" element={<InventoryList />} />
            </Route>

            {/* Catch all - Redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}
