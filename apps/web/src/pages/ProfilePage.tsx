import { ALERT_TYPE_LABELS, type TelegramLinkCode } from '../api/types';
import {
  createTelegramLinkCode,
  updateDeliveryChannels,
} from '../api/weatherflow';
import { useAuth, useApiErrorMessage } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  buildLinkCommand,
  describeBotDestination,
  getTelegramChannelStatus,
  isLinkCodeExpired,
} from './profile-page-state';
import { useEffect, useState } from 'react';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [inAppEnabled, setInAppEnabled] = useState(
    user?.deliveryChannels.inApp ?? true,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState<TelegramLinkCode | null>(null);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setInAppEnabled(user.deliveryChannels.inApp);
    }
  }, [user]);

  const telegramStatus = user
    ? getTelegramChannelStatus(user.deliveryChannels)
    : null;

  useEffect(() => {
    if (telegramStatus?.linked) {
      setLinkCode(null);
    }
  }, [telegramStatus?.linked]);

  if (!user || !telegramStatus) {
    return null;
  }

  const handleInAppToggle = async () => {
    const previous = inAppEnabled;
    const next = !previous;
    setInAppEnabled(next);
    setSaving(true);
    setError(null);
    try {
      await updateDeliveryChannels(user.id, {
        inApp: next,
      });
      await refreshUser();
    } catch (err) {
      setInAppEnabled(previous);
      setError(useApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateLinkCode = async () => {
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      const code = await createTelegramLinkCode(user.id);
      setLinkCode(code);
    } catch (err) {
      setTelegramError(useApiErrorMessage(err));
    } finally {
      setTelegramBusy(false);
    }
  };

  const handleVerifyLink = async () => {
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      await refreshUser();
    } catch (err) {
      setTelegramError(useApiErrorMessage(err));
    } finally {
      setTelegramBusy(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    setTelegramBusy(true);
    setTelegramError(null);
    try {
      await updateDeliveryChannels(user.id, {
        telegram: { chatId: null },
      });
      await refreshUser();
      setLinkCode(null);
    } catch (err) {
      setTelegramError(useApiErrorMessage(err));
    } finally {
      setTelegramBusy(false);
    }
  };

  const linkCodeExpired =
    linkCode !== null && isLinkCodeExpired(linkCode, new Date());

  return (
    <section>
      <h1>Perfil</h1>
      {error ? <ErrorBanner message={error} /> : null}
      <dl className="detail-list">
        <dt>Nombre</dt>
        <dd>
          {user.name} {user.lastName}
        </dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>ID</dt>
        <dd>
          <code>{user.id}</code>
        </dd>
        <dt>Registro</dt>
        <dd>{new Date(user.createdAt).toLocaleString('es-AR')}</dd>
      </dl>
      <h2>Canales de entrega</h2>
      <div className="panel">
        <label className="toggle-row">
          <span>
            <strong>Notificaciones en la app</strong>
            <small>Alertas en tiempo real y en el historial interno.</small>
          </span>
          <input
            type="checkbox"
            checked={inAppEnabled}
            disabled={saving}
            onChange={handleInAppToggle}
          />
        </label>
      </div>
      <div className="panel">
        <ErrorBanner message={telegramError} />
        <div className="toggle-row">
          <span>
            <strong>Telegram</strong>
            <small>Alertas directas en tu chat de Telegram.</small>
          </span>
          {telegramStatus.linked ? (
            <span className="badge">Vinculado</span>
          ) : (
            <span className="muted">No vinculado</span>
          )}
        </div>
        {telegramStatus.linked ? (
          <>
            <p>
              Chat vinculado: <code>{telegramStatus.chatId}</code>
            </p>
            <button
              type="button"
              className="danger"
              disabled={telegramBusy}
              onClick={() => void handleUnlinkTelegram()}
            >
              {telegramBusy ? 'Desvinculando…' : 'Desvincular Telegram'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={telegramBusy}
              onClick={() => void handleGenerateLinkCode()}
            >
              {telegramBusy && !linkCode
                ? 'Generando…'
                : 'Generar código de vinculación'}
            </button>
            {linkCode ? (
              <div className="stack">
                <p>
                  Código: <code>{linkCode.code}</code>
                  {linkCodeExpired ? (
                    <span className="tag-alert"> Expirado — generá uno nuevo.</span>
                  ) : null}
                </p>
                <p>
                  Expira: {new Date(linkCode.expiresAt).toLocaleString('es-AR')}
                </p>
                <p>
                  Enviá <code>{buildLinkCommand(linkCode)}</code> a{' '}
                  {describeBotDestination(linkCode)}
                  {linkCode.botUrl ? (
                    <>
                      {' '}
                      (
                      <a
                        href={linkCode.botUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        abrir bot
                      </a>
                      )
                    </>
                  ) : null}
                  . Luego verificá el estado.
                </p>
                <button
                  type="button"
                  disabled={telegramBusy}
                  onClick={() => void handleVerifyLink()}
                >
                  {telegramBusy ? 'Verificando…' : 'Ya envié el código — verificar'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
      <h2>Preferencias de alerta</h2>
      {user.notificationPreferences.length === 0 ? (
        <p className="muted">Sin suscripciones activas.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Estación</th>
              <th>Tipos de alerta</th>
            </tr>
          </thead>
          <tbody>
            {user.notificationPreferences.map((pref) => (
              <tr key={pref.stationId}>
                <td>
                  <code>{pref.stationId}</code>
                </td>
                <td>
                  {pref.alertTypes
                    .map((type) => ALERT_TYPE_LABELS[type])
                    .join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
