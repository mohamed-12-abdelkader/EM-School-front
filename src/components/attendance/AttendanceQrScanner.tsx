import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { Button } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const SCAN_COOLDOWN_MS = 2500;

interface AttendanceQrScannerProps {
  disabled?: boolean;
  onScan: (payload: string) => void | Promise<void>;
}

function extractPayload(result: unknown): string {
  if (!result) return '';
  if (typeof result === 'string') return result.trim();
  const r = result as Record<string, any>;
  if (typeof r.data === 'string') return r.data.trim();
  if (typeof r.nativeEvent?.data === 'string') return r.nativeEvent.data.trim();
  if (typeof r.rawValue === 'string') return r.rawValue.trim();
  return '';
}

type Detector = { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> };

async function createQrDetector(): Promise<Detector> {
  const Native = (globalThis as { BarcodeDetector?: new (opts: { formats: string[] }) => Detector })
    .BarcodeDetector;
  if (typeof Native !== 'undefined') {
    return new Native({ formats: ['qr_code'] });
  }
  const mod = await import('barcode-detector');
  return new mod.BarcodeDetector({ formats: ['qr_code'] }) as Detector;
}

/** Web scanner: getUserMedia + barcode-detector (expo-camera web scanning is unreliable). */
function WebQrScanner({ disabled, onScan }: AttendanceQrScannerProps) {
  const hostRef = useRef<View>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const busyRef = useRef(false);
  const lastValue = useRef('');
  const lastAt = useRef(0);
  const onScanRef = useRef(onScan);
  const disabledRef = useRef(!!disabled);
  const mountedRef = useRef(true);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('user');
  const [status, setStatus] = useState('تشغيل الكاميرا...');
  const [error, setError] = useState('');
  const [lastData, setLastData] = useState<string | null>(null);
  const [hostReady, setHostReady] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    disabledRef.current = !!disabled;
  }, [disabled]);

  const onHostLayout = (_e: LayoutChangeEvent) => {
    setHostReady(true);
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || !hostReady) return;

    mountedRef.current = true;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let videoEl: HTMLVideoElement | null = null;

    const node = hostRef.current as unknown as { _nativeNode?: HTMLElement } | HTMLElement | null;
    const host =
      node && '_nativeNode' in (node as object)
        ? (node as { _nativeNode?: HTMLElement })._nativeNode
        : (node as HTMLElement | null);

    // RN-web: find DOM node via query on container id
    const container =
      (typeof document !== 'undefined' &&
        document.getElementById('em-attendance-qr-host')) ||
      null;

    async function start() {
      setError('');
      setStatus('طلب إذن الكاميرا...');
      try {
        detectorRef.current = await createQrDetector();

        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const mountTarget = container;
        if (!mountTarget) {
          setError('تعذر تهيئة عنصر الفيديو');
          return;
        }

        mountTarget.innerHTML = '';
        videoEl = document.createElement('video');
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('muted', 'true');
        videoEl.setAttribute('autoplay', 'true');
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'cover';
        if (facingMode === 'user') {
          videoEl.style.transform = 'scaleX(-1)';
        }
        videoEl.srcObject = stream;
        mountTarget.appendChild(videoEl);
        videoRef.current = videoEl;
        await videoEl.play();

        setStatus('وجّه الكاميرا نحو QR الطالب');
        schedule();
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string };
        setError(
          e?.name === 'NotAllowedError'
            ? 'تم رفض إذن الكاميرا — اسمح بها من إعدادات المتصفح ثم أعد المحاولة'
            : e?.message || 'تعذر تشغيل الكاميرا',
        );
        setStatus('الكاميرا غير متاحة');
      }
    }

    async function tick() {
      if (cancelled || !mountedRef.current) return;
      const video = videoRef.current;
      const detector = detectorRef.current;

      if (
        !disabledRef.current &&
        !busyRef.current &&
        video &&
        detector &&
        video.readyState >= 2 &&
        video.videoWidth > 0
      ) {
        try {
          const bitmap = await createImageBitmap(video);
          const codes = await detector.detect(bitmap);
          bitmap.close();
          const data = String(codes?.[0]?.rawValue || '').trim();
          if (data) {
            const now = Date.now();
            const isDup =
              data === lastValue.current && now - lastAt.current < SCAN_COOLDOWN_MS;
            if (!isDup) {
              busyRef.current = true;
              lastValue.current = data;
              lastAt.current = now;
              setLastData(data);
              setStatus('جاري التسجيل...');
              try {
                await onScanRef.current(data);
                if (mountedRef.current) setStatus('تم — جاهز للطالب التالي');
              } catch {
                if (mountedRef.current) setStatus('فشل التسجيل — حاول مرة أخرى');
              } finally {
                setTimeout(() => {
                  busyRef.current = false;
                  if (mountedRef.current) {
                    setStatus('وجّه الكاميرا نحو QR الطالب');
                  }
                }, SCAN_COOLDOWN_MS);
              }
            }
          }
        } catch {
          // keep scanning
        }
      }
      schedule();
    }

    function schedule() {
      timer = setTimeout(tick, 300);
    }

    start();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (timer) clearTimeout(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      videoRef.current = null;
      if (container) container.innerHTML = '';
    };
  }, [facingMode, hostReady]);

  return (
    <View style={styles.wrap}>
      <View style={styles.cameraShell} onLayout={onHostLayout}>
        <View
          nativeID="em-attendance-qr-host"
          ref={hostRef}
          style={styles.camera}
          collapsable={false}
        />
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.overlayHint}>{status}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <Button
          label={facingMode === 'user' ? 'جرّب الكاميرا الخلفية' : 'جرّب الكاميرا الأمامية'}
          variant="outline"
          size="sm"
          onPress={() =>
            setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))
          }
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {lastData ? (
        <View style={styles.lastBox}>
          <Text style={styles.lastLabel}>آخر قيمة ممسوحة</Text>
          <Text style={styles.lastValue} numberOfLines={2}>
            {lastData}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function NativeQrScanner({ disabled, onScan }: AttendanceQrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [cameraError, setCameraError] = useState('');
  const [lastData, setLastData] = useState<string | null>(null);
  const [status, setStatus] = useState('وجّه الكاميرا نحو QR الطالب');

  const onScanRef = useRef(onScan);
  const disabledRef = useRef(!!disabled);
  const busyRef = useRef(false);
  const lastValue = useRef('');
  const lastAt = useRef(0);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    disabledRef.current = !!disabled;
  }, [disabled]);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain !== false) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcode = useCallback(async (result: BarcodeScanningResult) => {
    if (disabledRef.current || busyRef.current) return;
    const data = extractPayload(result);
    if (!data) return;

    const now = Date.now();
    if (data === lastValue.current && now - lastAt.current < SCAN_COOLDOWN_MS) {
      return;
    }

    busyRef.current = true;
    lastValue.current = data;
    lastAt.current = now;
    setLastData(data);
    setStatus('جاري التسجيل...');

    try {
      await onScanRef.current(data);
      setStatus('تم — جاهز للطالب التالي');
    } catch {
      setStatus('فشل التسجيل — حاول مرة أخرى');
    } finally {
      setTimeout(() => {
        busyRef.current = false;
        setStatus('وجّه الكاميرا نحو QR الطالب');
      }, SCAN_COOLDOWN_MS);
    }
  }, []);

  if (!permission) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>جارٍ التحقق من صلاحية الكاميرا...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>الكاميرا مطلوبة لمسح QR</Text>
        <Text style={styles.fallbackText}>
          اسمح بالوصول للكاميرا لتسجيل حضور الطلاب بالمسح.
        </Text>
        <Button label="السماح بالكاميرا" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.cameraShell}>
        <CameraView
          style={styles.camera}
          facing={facing}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcode}
          onMountError={(e) =>
            setCameraError(e?.message || 'تعذر تشغيل الكاميرا')
          }
          onCameraReady={() => setCameraError('')}
        />
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.overlayHint}>{status}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <Button
          label={facing === 'back' ? 'كاميرا أمامية' : 'كاميرا خلفية'}
          variant="outline"
          size="sm"
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
        />
      </View>

      {cameraError ? <Text style={styles.errorText}>{cameraError}</Text> : null}

      {lastData ? (
        <View style={styles.lastBox}>
          <Text style={styles.lastLabel}>آخر قيمة ممسوحة</Text>
          <Text style={styles.lastValue} numberOfLines={2}>
            {lastData}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function AttendanceQrScanner(props: AttendanceQrScannerProps) {
  if (Platform.OS === 'web') {
    return <WebQrScanner {...props} />;
  }
  return <NativeQrScanner {...props} />;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  cameraShell: {
    height: 360,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  camera: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.14)',
  },
  frame: {
    width: 210,
    height: 210,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.onBrand,
  },
  overlayHint: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.onBrand,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(15,23,42,0.45)',
    overflow: 'hidden',
    borderRadius: radii.md,
    paddingVertical: 6,
  },
  toolbar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.md,
  },
  fallback: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fallbackTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  fallbackText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'right',
  },
  lastBox: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lastLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
  },
  lastValue: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});
