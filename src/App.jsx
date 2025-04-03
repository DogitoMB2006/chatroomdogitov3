import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Register from './components/Register';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';
import Home from './pages/Home';
import Chats from "./pages/Chats"; // arriba
import PrivateChat from "./pages/PrivateChat"; // arriba
import EditProfile from "./pages/EditProfile";
export default function App() {
  return (
    <Router>
      <div>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/chat" element={<Chats />} />
          <Route path="/chat/:username" element={<PrivateChat />} />
          <Route path="/editprofile" element={<EditProfile />} />
        </Routes>
    
      </div>
    </Router>
  );
}
