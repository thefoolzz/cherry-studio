import { Button, Switch } from '@cherrystudio/ui'
import { usePreference } from '@data/hooks/usePreference'
import {
  SettingDivider,
  SettingGroup,
  SettingRow,
  SettingRowTitle,
  SettingTitle
} from '@renderer/components/SettingsPrimitives'
import { useAppUpdateState } from '@renderer/hooks/useAppUpdateState'
import { useTheme } from '@renderer/hooks/useTheme'
import { ipcApi } from '@renderer/ipc'
import { toast } from '@renderer/services/toast'
import { debounce } from 'es-toolkit/compat'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const UpdateSettings = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [autoCheckUpdate, setAutoCheckUpdate] = usePreference('app.dist.auto_update.enabled')
  const [version, setVersion] = useState('')
  const [isPortable, setIsPortable] = useState(false)
  const { appUpdateState, updateAppUpdateState } = useAppUpdateState()

  useEffect(() => {
    void (async () => {
      const appInfo = await ipcApi.request('app.get_info')
      setVersion(appInfo.version)
      setIsPortable(appInfo.isPortable)
    })()
  }, [])

  const onCheckUpdate = debounce(
    async () => {
      if (appUpdateState.checking || appUpdateState.downloading) {
        return
      }

      if (appUpdateState.downloaded) {
        // Dynamic import: the dialog drags the streamdown/remark markdown stack along and is
        // rarely opened, so it must not ship inside the default settings chunk.
        await import('@renderer/components/UpdateDialogPopup')
          .then(({ default: UpdateDialogPopup }) =>
            UpdateDialogPopup.show({ releaseInfo: appUpdateState.info || null })
          )
          .catch(() => toast.error(t('settings.about.updateError')))
        return
      }

      updateAppUpdateState({ checking: true, manualCheck: true })

      try {
        await ipcApi.request('app.updater.check_for_update')
      } catch {
        updateAppUpdateState({ manualCheck: false })
        toast.error(t('settings.about.updateError'))
      }

      updateAppUpdateState({ checking: false })
    },
    2000,
    { leading: true, trailing: false }
  )

  const isUpdateReady = appUpdateState.available && appUpdateState.downloaded && !appUpdateState.downloading

  return (
    <SettingGroup theme={theme}>
      <SettingTitle>{t('settings.update.title')}</SettingTitle>
      <SettingDivider />
      <SettingRow>
        <SettingRowTitle className="font-mono">{version ? `v${version}` : ''}</SettingRowTitle>
        {/* A portable build cannot replace itself, so it gets no update controls at all. */}
        {!isPortable && (
          <Button
            size="sm"
            variant={isUpdateReady ? 'default' : 'outline'}
            loading={appUpdateState.checking}
            onClick={onCheckUpdate}
            disabled={appUpdateState.downloading}>
            {appUpdateState.downloading
              ? t('settings.about.downloading')
              : appUpdateState.available
                ? t('settings.about.checkUpdate.available')
                : t('settings.about.checkUpdate.label')}
          </Button>
        )}
      </SettingRow>
      {!isPortable && (
        <>
          <SettingDivider />
          <SettingRow>
            <SettingRowTitle>{t('settings.general.auto_check_update.title')}</SettingRowTitle>
            <Switch checked={autoCheckUpdate} onCheckedChange={(checked) => void setAutoCheckUpdate(checked)} />
          </SettingRow>
        </>
      )}
    </SettingGroup>
  )
}
