import React, { useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Share2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { BottomSheet, GlassButton, GlassCard } from '../ui';

interface Props {
  open: boolean;
  onClose: () => void;
  barbershopId: string;
  barbershopName: string;
}

export const LigaPublicQRModal: React.FC<Props> = ({ open, onClose, barbershopId, barbershopName }) => {
  const url = useMemo(
    () => `${window.location.origin}${window.location.pathname}?liga=${barbershopId}`,
    [barbershopId]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado');
    } catch {
      toast.error('No se pudo copiar — probá compartir');
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Liga del Corte — ${barbershopName}`,
          text: `Mirá el ranking en vivo de la Liga del Corte en ${barbershopName}`,
          url,
        });
      } catch {
        // user canceled — ignore
      }
    } else {
      copy();
    }
  };

  const downloadPng = () => {
    const canvas = document.querySelector<HTMLCanvasElement>('#liga-qr-canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `liga-qr-${barbershopName.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={`QR del ranking público`} subtitle={barbershopName}>
      <div className="p-5 space-y-4">
        <GlassCard variant="solid" padding="md">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeCanvas
                id="liga-qr-canvas"
                value={url}
                size={220}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="text-[11px] text-ios-label2 dark:text-iosDark-label2 text-center font-mono break-all max-w-full">
              {url}
            </div>
          </div>
        </GlassCard>

        <p className="text-[12px] text-ios-label2 dark:text-iosDark-label2 leading-relaxed text-center">
          💡 Imprimí este QR y ponelo en la pared del local. Los clientes lo escanean y ven el ranking en vivo sin descargar nada.
        </p>

        <div className="grid grid-cols-3 gap-2">
          <GlassButton variant="secondary" size="sm" iconLeft={<Copy className="w-3.5 h-3.5" />} onClick={copy} fullWidth>
            Copiar
          </GlassButton>
          <GlassButton variant="secondary" size="sm" iconLeft={<Share2 className="w-3.5 h-3.5" />} onClick={share} fullWidth>
            Compartir
          </GlassButton>
          <GlassButton variant="primary" size="sm" iconLeft={<Download className="w-3.5 h-3.5" />} onClick={downloadPng} fullWidth>
            PNG
          </GlassButton>
        </div>
      </div>
    </BottomSheet>
  );
};

export default LigaPublicQRModal;
