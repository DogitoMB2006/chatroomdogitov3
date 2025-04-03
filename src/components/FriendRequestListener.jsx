import { useContext, useEffect, useRef } from "react";
import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs
} from "firebase/firestore";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function FriendRequestListener() {
  const { userData } = useContext(AuthContext);
  const { showToast } = useToast();
  const processedRequestsRef = useRef(new Set());

  useEffect(() => {
    if (!userData) return;


    const q = query(
      collection(db, "friendRequests"),
      where("to", "==", userData.username),
      where("status", "==", "pending"),
      orderBy("timestamp", "desc") 
    );

    const unsub = onSnapshot(q, async (snapshot) => {
     
      const newRequests = snapshot.docChanges().filter(change => change.type === "added");

      for (const change of newRequests) {
        const requestId = change.doc.id;
        
       
        if (processedRequestsRef.current.has(requestId)) continue;
        processedRequestsRef.current.add(requestId);
        
        const requestData = change.doc.data();
        
        
        const senderQuery = query(
          collection(db, "users"),
          where("username", "==", requestData.from)
        );
        
        const senderSnap = await getDocs(senderQuery);
        const senderData = !senderSnap.empty ? senderSnap.docs[0].data() : null;
        
       
        showToast({
          type: "friendRequest",
          username: requestData.from,
          text: "Te ha enviado una solicitud de amistad",
          photoURL: senderData?.photoURL,
          from: requestData.from,
          to: userData.username,
          requestId: requestId,
          timestamp: requestData.timestamp
        });
      }
    });

    return () => unsub();
  }, [userData, showToast]);

  return null; 
}