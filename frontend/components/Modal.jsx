import React from 'react';

const Modal = ({ children, onClose }) => {
    return (
        <div className="modal-overlay" 
             style={{
                 position: 'fixed',
                 top: 0,
                 left: 0,
                 right: 0,
                 bottom: 0,
                 backgroundColor: 'rgba(0,0,0,0.5)',
                 display: 'flex',
                 justifyContent: 'center',
                 alignItems: 'center',
                 zIndex: 2000
             }}>
            <div className="modal-content" 
                 style={{
                     backgroundColor: 'white',
                     padding: '20px',
                     borderRadius: '8px',
                     width: '80%',
                     maxHeight: '80vh',
                     overflow: 'auto',
                     position: 'relative'
                 }}>
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        right: '10px',
                        top: '10px',
                        padding: '5px 10px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: '#f0f0f0',
                        cursor: 'pointer'
                    }}
                >
                    ✕
                </button>
                <div style={{ marginTop: '20px' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
