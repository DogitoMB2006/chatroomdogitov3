import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Register from './components/Register';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';
import Home from './pages/Home';
import Chats from "./pages/Chats";
import PrivateChat from "./pages/PrivateChat";
import EditProfile from "./pages/EditProfile";
import NotificationListener from './components/NotificationListener';
import { ToastProvider } from "./context/ToastContext";
import GroupChatPage from "./pages/groupchatpage";
import GroupNotificationListener from "./components/GroupNotificationListener";
import FriendRequestListener from './components/FriendRequestListener';

export default function App() {
  /* useEffect(() => {
    const notifKey = "notificacionesAceptadas";
  
    if (Notification.permission === "granted" || localStorage.getItem(notifKey)) {
      return;
    }
  
    if (Notification.permission !== "denied") {
      const aceptar = confirm("¿Quieres habilitar notificaciones de mensajes?");
      if (aceptar) {
        Notification.requestPermission().then((permiso) => {
          if (permiso === "granted") {
            localStorage.setItem(notifKey, "true");
          }
        });
      } else {
        localStorage.setItem(notifKey, "rechazado");
      }
    }
  }, []); */
  

  return (
    <Router>
      <ToastProvider>
        <div>
          <Navbar />
          
        
          <NotificationListener />
          <GroupNotificationListener />
          <FriendRequestListener />
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/chat" element={<Chats />} />
            <Route path="/chat/:username" element={<PrivateChat />} />
            <Route path="/editprofile" element={<EditProfile />} />
            <Route path="/chat/group/:groupId" element={<GroupChatPage />} />
          </Routes>
          
        </div>
      </ToastProvider>
    </Router>
  );
}