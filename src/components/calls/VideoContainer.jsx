// VideoContainer.jsx
import React from 'react';
import LocalVideo from './LocalVideo';
import RemoteVideo from './RemoteVideo';

const VideoContainer = ({ 
  localVideoRef, 
  remoteVideoRef, 
  localStreamRef,
  myUsername, 
  otherUsername, 
  status, 
  localAudioMuted, 
  remoteAudioMuted, 
  toggleLocalAudio, 
  toggleRemoteAudio, 
  checkRemoteAudio 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <LocalVideo 
        localVideoRef={localVideoRef} 
        username={myUsername} 
        localAudioMuted={localAudioMuted} 
        toggleLocalAudio={toggleLocalAudio} 
      />
      
      <RemoteVideo 
        remoteVideoRef={remoteVideoRef} 
        username={otherUsername} 
        status={status} 
        remoteAudioMuted={remoteAudioMuted} 
        toggleRemoteAudio={toggleRemoteAudio} 
        checkRemoteAudio={checkRemoteAudio} 
      />
    </div>
  );
};

export default VideoContainer;