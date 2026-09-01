import { t } from '@main/i18n'
import type { BrowserWindow } from 'electron'

import type {
  PlatformDraftImage,
  PlatformDraftInput,
  PlatformDraftResult,
  PlatformLoginState,
  PlatformPublisher
} from './PlatformPublisher'
import { WechatContentRenderer } from './WechatContentRenderer'

type WechatDraftScriptResult = {
  appMsgId?: string
  editUrl?: string
  error?: string
}

/** Creates WeChat drafts through the page-authenticated operate_appmsg API. */
export class WechatPublisher implements PlatformPublisher {
  readonly platform = 'wechat' as const
  readonly homeUrl = 'https://mp.weixin.qq.com/'
  readonly supportsDrafts = true
  private readonly contentRenderer = new WechatContentRenderer()

  getWindowTitle(displayName: string): string {
    const platformName = t('publishing.platforms.wechat')
    return displayName === platformName ? displayName : `${displayName} · ${platformName}`
  }

  renderMarkdown(source: string): string {
    return this.contentRenderer.render(source)
  }

  async readLoginState(window: BrowserWindow): Promise<PlatformLoginState> {
    const value = await window.webContents.executeJavaScript(
      `(() => {
        const readName = () => {
          const selectors = [
            '.acount_box-nickname',
            '.account_box-panel-head__nickname',
            '.weui-desktop-account__info',
            '#js_account_name',
            '.weui-desktop_name',
            '.account_name'
          ]
          for (const selector of selectors) {
            const name = document.querySelector(selector)?.textContent?.trim()
            if (name && !['服务号', '订阅号', '企业号', 'Service Account', 'Subscription Account'].includes(name)) {
              return name
            }
          }
          return undefined
        }
        const loggedIn = Boolean(readName()) || /\\/(cgi-bin\\/(home|appmsg)|home)/.test(location.pathname)
        return { loggedIn, accountName: readName() }
      })()`,
      true
    )
    return {
      loggedIn: Boolean(value?.loggedIn),
      ...(typeof value?.accountName === 'string' && value.accountName ? { accountName: value.accountName } : {})
    }
  }

  async createDraft(window: BrowserWindow, input: PlatformDraftInput): Promise<PlatformDraftResult> {
    if (window.isDestroyed() || window.webContents.isCrashed()) {
      throw new Error(t('publishing.errors.window_unavailable'))
    }

    const payload = JSON.stringify({
      taskId: input.taskId,
      title: input.title,
      html: this.renderMarkdown(input.markdown),
      images: input.images ?? [],
      messages: {
        coverCropFailed: t('publishing.errors.cover_crop_failed'),
        coverSizeFailed: t('publishing.errors.cover_size_failed'),
        draftFailed: t('publishing.errors.draft_failed'),
        imageUploadFailed: t('publishing.errors.image_upload_failed'),
        tokenMissing: t('publishing.errors.token_missing')
      }
    })
    const result = (await window.webContents.executeJavaScript(
      `(${buildCreateDraftScript.toString()})(${payload})`,
      true
    )) as WechatDraftScriptResult

    if (!result?.appMsgId) {
      throw new Error(result?.error ?? t('publishing.errors.draft_failed'))
    }

    const editUrl = result.editUrl || window.webContents.getURL()
    await window.loadURL(editUrl)
    return { remoteDraftId: result.appMsgId, editUrl }
  }
}

/** Runs in the authenticated WeChat page. Keep this function dependency-free. */
async function buildCreateDraftScript(input: {
  taskId: string
  title: string
  html: string
  images: PlatformDraftImage[]
  messages: {
    coverCropFailed: string
    coverSizeFailed: string
    draftFailed: string
    imageUploadFailed: string
    tokenMissing: string
  }
}): Promise<WechatDraftScriptResult> {
  type WechatPageInfo = { token: string; nickname: string; ticket: string; userName: string }
  type UploadedImage = { id: string; fileId: number; url: string }
  type CropConfig = {
    ratio: string
    apiRatio: string
    x1: number
    y1: number
    x2: number
    y2: number
    x1Abs: number
    y1Abs: number
    x2Abs: number
    y2Abs: number
  }
  type CroppedImage = CropConfig & { fileId: number; url: string }

  const pageWindow = window as typeof window & {
    wx?: { commonData?: { data?: Record<string, unknown> } & Record<string, unknown> }
  }

  const readInfo = (): WechatPageInfo | null => {
    const common = pageWindow.wx?.commonData
    const data = common?.data || common || {}
    const token = String(data.t || data.token || new URLSearchParams(location.search).get('token') || '')
    if (!token) return null
    return {
      token,
      nickname: decodeURIComponent(String(data.nick_name || data.nickName || '')),
      ticket: String(data.ticket || ''),
      userName: String(data.user_name || data.userName || '')
    }
  }

  const imageDataUrl = (image: PlatformDraftImage) => `data:${image.mime};base64,${image.content}`

  const uploadImage = async (image: PlatformDraftImage, info: WechatPageInfo): Promise<UploadedImage> => {
    const binary = atob(image.content)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    const blob = new Blob([bytes], { type: image.mime || 'image/jpeg' })
    const formData = new FormData()
    formData.append('type', blob.type)
    formData.append('id', Date.now().toString())
    formData.append('name', image.name)
    formData.append('lastModifiedDate', new Date().toString())
    formData.append('size', blob.size.toString())
    formData.append('file', blob, image.name)

    const url = new URL('https://mp.weixin.qq.com/cgi-bin/filetransfer')
    url.searchParams.set('action', 'upload_material')
    url.searchParams.set('f', 'json')
    url.searchParams.set('scene', '8')
    url.searchParams.set('writetype', 'doublewrite')
    url.searchParams.set('groupid', '1')
    url.searchParams.set('ticket_id', info.userName)
    url.searchParams.set('ticket', info.ticket)
    url.searchParams.set('svr_time', String(Math.floor(Date.now() / 1000)))
    url.searchParams.set('token', info.token)
    url.searchParams.set('lang', 'zh_CN')
    url.searchParams.set('seq', Date.now().toString())
    url.searchParams.set('t', Math.random().toString())

    const response = await fetch(url, { method: 'POST', body: formData, credentials: 'include' })
    const result = await response.json()
    if (result?.base_resp?.err_msg !== 'ok' || !result.cdn_url) {
      throw new Error(result?.base_resp?.err_msg || `${input.messages.imageUploadFailed} ret=${result?.base_resp?.ret}`)
    }
    return { id: image.id, fileId: Number.parseInt(result.content, 10), url: result.cdn_url }
  }

  const readImageSize = (image: PlatformDraftImage): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve({ width: element.width, height: element.height })
      element.onerror = () => reject(new Error(input.messages.coverSizeFailed))
      element.src = imageDataUrl(image)
    })

  const calculateCrop = (ratio: number, label: string, apiRatio: string, width: number, height: number): CropConfig => {
    let x1 = 0
    let y1 = 0
    let x2 = 1
    let y2 = 1
    if (width / height > ratio) {
      const crop = (width - height * ratio) / 2 / width
      x1 = crop
      x2 = 1 - crop
    } else {
      const crop = (height - width / ratio) / 2 / height
      y1 = crop
      y2 = 1 - crop
    }
    return {
      ratio: label,
      apiRatio,
      x1,
      y1,
      x2,
      y2,
      x1Abs: Math.round(x1 * width),
      y1Abs: Math.round(y1 * height),
      x2Abs: Math.round(x2 * width),
      y2Abs: Math.round(y2 * height)
    }
  }

  const cropCover = async (
    source: UploadedImage,
    image: PlatformDraftImage,
    token: string
  ): Promise<CroppedImage[]> => {
    const { width, height } = await readImageSize(image)
    const configs = [
      calculateCrop(16 / 9, '16:9', '16_9', width, height),
      calculateCrop(1, '1:1', '1_1', width, height),
      calculateCrop(3 / 4, '3:4', '3_4', width, height)
    ]
    const formData = new FormData()
    formData.append('imgurl', source.url)
    formData.append('size_count', String(configs.length))
    configs.forEach((config, index) => {
      formData.append(`size${index}_x1`, String(config.x1))
      formData.append(`size${index}_y1`, String(config.y1))
      formData.append(`size${index}_x2`, String(config.x2))
      formData.append(`size${index}_y2`, String(config.y2))
    })
    formData.append('token', token)
    formData.append('lang', 'zh_CN')
    formData.append('f', 'json')
    formData.append('ajax', '1')

    const response = await fetch('https://mp.weixin.qq.com/cgi-bin/cropimage?action=crop_multi', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })
    const result = await response.json()
    if (result?.base_resp?.err_msg !== 'ok') {
      throw new Error(result?.base_resp?.err_msg || input.messages.coverCropFailed)
    }
    return result.result.map((item: { cdnurl: string; file_id: number }, index: number) => ({
      ...configs[index],
      url: item.cdnurl,
      fileId: item.file_id
    }))
  }

  const createArticle = async (info: WechatPageInfo, html: string, coverImages: CroppedImage[]): Promise<string> => {
    const formData = new FormData()
    formData.append('token', info.token)
    formData.append('lang', 'zh_CN')
    formData.append('f', 'json')
    formData.append('ajax', '1')
    formData.append('random', Math.random().toString())
    formData.append('AppMsgId', '')
    formData.append('count', '1')
    formData.append('data_seq', '0')
    formData.append('operate_from', 'Chrome')
    formData.append('isnew', '0')
    formData.append('ad_video_transition0', '')
    formData.append('can_reward0', '0')
    formData.append('related_video0', '')
    formData.append('is_video_recommend0', '-1')

    const root = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
    const digest = (root.body.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120)
    formData.append('title0', input.title.slice(0, 64))
    formData.append('author0', info.nickname)
    formData.append('writerid0', '0')
    formData.append('fileid0', '')
    formData.append('digest0', digest)
    formData.append('auto_gen_digest0', '1')
    formData.append('content0', html)
    formData.append('sourceurl0', '')
    formData.append('need_open_comment0', '1')
    formData.append('only_fans_can_comment0', '0')

    const byRatio = (ratio: string) => coverImages.find((image) => image.ratio === ratio)
    const defaultImage = byRatio('1:1')?.url || coverImages[0]?.url || ''
    formData.append('cdn_url0', defaultImage)
    formData.append('cdn_235_1_url0', defaultImage)
    formData.append('cdn_16_9_url0', byRatio('16:9')?.url || '')
    formData.append('cdn_3_4_url0', byRatio('3:4')?.url || '')
    formData.append('cdn_1_1_url0', byRatio('1:1')?.url || '')
    formData.append('cdn_url_back0', byRatio('1:1')?.url || defaultImage)
    formData.append(
      'crop_list0',
      JSON.stringify({
        crop_list: coverImages.map((image) => ({
          ratio: image.apiRatio,
          x1: image.x1Abs,
          y1: image.y1Abs,
          x2: image.x2Abs,
          y2: image.y2Abs,
          file_id: image.fileId
        })),
        crop_list_percent: coverImages.map((image) => ({
          ratio: image.apiRatio,
          x1: image.x1,
          y1: image.y1,
          x2: image.x2,
          y2: image.y2,
          file_id: image.fileId
        }))
      })
    )

    const emptyFields = [
      'music_id0',
      'video_id0',
      'voteid0',
      'voteismlt0',
      'supervoteid0',
      'cardid0',
      'cardquantity0',
      'cardlimit0',
      'vid_type0',
      'shortvideofileid0',
      'releasefirst0',
      'platform0',
      'reprint_permit_type0',
      'allow_reprint0',
      'allow_reprint_modify0',
      'original_article_type0',
      'ori_white_list0',
      'free_content0',
      'ad_id0',
      'guide_words0',
      'share_copyright_url0',
      'source_article_type0',
      'reprint_recommend_title0',
      'reprint_recommend_content0',
      'share_video_id0',
      'share_voice_id0',
      'insert_ad_mode0'
    ]
    emptyFields.forEach((field) => formData.append(field, ''))
    formData.append('show_cover_pic0', '0')
    formData.append('copyright_type0', '0')
    formData.append('fee0', '0')
    formData.append('is_share_copyright0', '0')
    formData.append('share_page_type0', '0')
    formData.append('share_imageinfo0', JSON.stringify({ list: [] }))
    formData.append('dot0', '{}')
    formData.append('categories_list0', '[]')
    formData.append('compose_info0', '{"list":""}')

    const url = new URL('https://mp.weixin.qq.com/cgi-bin/operate_appmsg')
    url.searchParams.set('t', 'ajax-response')
    url.searchParams.set('sub', 'create')
    url.searchParams.set('type', '77')
    url.searchParams.set('token', info.token)
    url.searchParams.set('lang', 'zh_CN')
    const response = await fetch(url, { method: 'POST', body: formData, credentials: 'include' })
    const result = await response.json()
    if (!result?.appMsgId) {
      throw new Error(String(result?.base_resp?.err_msg || result?.base_resp?.ret || input.messages.draftFailed))
    }
    return String(result.appMsgId)
  }

  try {
    const info = readInfo()
    if (!info) return { error: input.messages.tokenMissing }

    const uploaded = await Promise.all(input.images.map((image) => uploadImage(image, info)))
    const uploadedById = new Map(uploaded.map((image) => [image.id, image]))
    const document = new DOMParser().parseFromString(`<div id="root">${input.html}</div>`, 'text/html')
    for (const image of document.querySelectorAll<HTMLImageElement>('img')) {
      const match = image.getAttribute('src')?.match(/^attachment:\/\/([\w.-]+)$/)
      if (!match) continue
      const source = uploadedById.get(match[1])
      if (!source) {
        image.remove()
        continue
      }
      image.src = source.url
      image.setAttribute('data-src', source.url)
      image.style.maxWidth = '100%'
      image.style.height = 'auto'
      image.style.display = 'block'
      image.style.margin = '12px auto'
    }
    const html = document.getElementById('root')?.innerHTML || input.html

    const firstReferencedId = input.html.match(/attachment:\/\/([\w.-]+)/)?.[1]
    const coverSource = firstReferencedId ? uploadedById.get(firstReferencedId) : uploaded[0]
    const coverImage = firstReferencedId
      ? input.images.find((image) => image.id === firstReferencedId)
      : input.images[0]
    const coverImages = coverSource && coverImage ? await cropCover(coverSource, coverImage, info.token) : []
    const appMsgId = await createArticle(info, html, coverImages)
    const editUrl = new URL('https://mp.weixin.qq.com/cgi-bin/appmsg')
    editUrl.searchParams.set('t', 'media/appmsg_edit')
    editUrl.searchParams.set('action', 'edit')
    editUrl.searchParams.set('type', '77')
    editUrl.searchParams.set('appmsgid', appMsgId)
    editUrl.searchParams.set('token', info.token)
    editUrl.searchParams.set('lang', 'zh_CN')
    return { appMsgId, editUrl: editUrl.toString() }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}
