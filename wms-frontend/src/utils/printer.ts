import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

/**
 * Servicio de impresión dual para WMS Formatex
 * Maneja la lógica de impresión dependiendo si estamos en Web (Vercel) o en App Nativa (Android APK vía Capacitor).
 */

export const PrinterService = {
  /**
   * Envía un comando de impresión a la impresora térmica local (ej. TC-60)
   * @param rawData Cadena de texto o buffer en formato ESC/POS (o ZPL si la impresora lo soporta)
   */
  async printThermal(rawData: string): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        // Aquí iría la integración con el plugin nativo de Bluetooth Serial o el SDK del fabricante
        // Ejemplo ficticio de uso de un plugin de comunidad:
        // await BluetoothSerial.write({ data: rawData });
        
        console.log('[Native Print Command Sent]:\n', rawData);
        toast.success('Imprimiendo en handheld...');
        
        // Simulación temporal de éxito
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      } catch (error) {
        console.error('Error al imprimir nativo:', error);
        toast.error('Error de conexión con la impresora interna');
        return false;
      }
    } else {
      // Estamos en la Web (PWA en Chrome)
      // La web no tiene acceso directo al hardware sin usar una app puente como RawBT
      // o la API Web Bluetooth (si la impresora se expone como dispositivo BLE).
      console.log('[Web Print Fallback]: No estamos en nativo. Datos generados:\n', rawData);
      
      // Como workaround para la web, podríamos intentar abrir la ventana de impresión
      // o redirigir a un esquema URL (ej. rawbt:...)
      toast('Impresión redirigida a la cola web', { icon: '🖨️' });
      return false; // Retornamos false porque no garantizamos impresión directa
    }
  },

  /**
   * Genera comandos ESC/POS básicos para impresoras térmicas de 58mm (Handhelds chinas)
   */
  generateEscPosLabel(data: any): string {
    // Caracteres de control básicos ESC/POS
    const ESC = '\\x1B';
    const GS = '\\x1D';
    
    // Inicializar impresora
    let cmd = `${ESC}@`; 
    
    // Texto centrado
    cmd += `${ESC}a1`; 
    cmd += `FORMATEX WMS\\n`;
    
    // Texto normal
    cmd += `${ESC}a0`;
    cmd += `HU: ${data.codigo}\\n`;
    cmd += `SKU: ${data.sku}\\n`;
    cmd += `Metraje: ${data.metraje}m\\n`;
    
    // Código de barras (Simulado)
    // cmd += `${GS}k...`
    
    cmd += `\\n\\n\\n`; // Feed paper
    return cmd;
  }
};
