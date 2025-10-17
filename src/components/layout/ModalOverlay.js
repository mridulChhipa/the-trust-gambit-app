'use client';

export default function ModalOverlay({ children, onClose }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur"
            onClick={onClose}
            role="presentation"
        >
            <div className="relative z-10" onClick={(event) => event.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}
