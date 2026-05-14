"use client";

import React, { useEffect, useState } from "react";

export function ConfigScreen() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(window.location.origin);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Configura tu API de WhatsApp
        </h1>
        <p className="text-gray-600 mb-6">
          Parece que las variables de entorno no están configuradas correctamente o hubo un error al conectar con Graph API.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
          Revisa tu archivo <code>.env.local</code>. Debes tener configuradas al menos:
          <ul className="list-disc ml-5 mt-2 space-y-1 font-mono">
            <li>META_ACCESS_TOKEN</li>
            <li>META_PHONE_NUMBER_ID</li>
            <li>META_APP_SECRET</li>
            <li>META_VERIFY_TOKEN</li>
          </ul>
        </div>

        <h2 className="text-lg font-semibold mb-2">Datos para el Webhook de Meta:</h2>
        <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm break-all mb-6">
          <p><strong>URL del Webhook:</strong> {url}/api/webhook</p>
          <p className="mt-2 text-xs text-gray-500">Recuerda que debe ser HTTPS. Si estás en local, usa ngrok.</p>
        </div>

        <h2 className="text-lg font-semibold mb-2">Pasos a seguir:</h2>
        <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700">
          <li>Crea una app en <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline">Meta for Developers</a>.</li>
          <li>Agrega el producto WhatsApp a tu App.</li>
          <li>Copia tu <strong>Phone Number ID</strong>, el <strong>WABA ID</strong> y el <strong>App Secret</strong> (en App Dashboard → Settings → Basic).</li>
          <li>Genera un <strong>System User Token permanente</strong> (Business Settings → System Users), no uses el token de prueba de 24h.</li>
          <li>Configura el webhook con la URL indicada arriba usando tu <strong>META_VERIFY_TOKEN</strong> elegido.</li>
          <li>Suscribe el webhook al campo <strong>messages</strong> de tu número.</li>
        </ol>

        <button 
          onClick={() => window.location.reload()} 
          className="mt-8 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
        >
          Reintentar conexión
        </button>
      </div>
    </div>
  );
}
