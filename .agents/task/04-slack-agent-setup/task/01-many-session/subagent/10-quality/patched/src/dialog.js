const greeting =
  /^(?:hi(?: there)?|hey(?: there)?|hello(?: there)?|thanks(?: for (?:the|your) help)?|thank you|嗨|哈[啰喽]|你们?好|您好|早上好|下午好|晚上好|谢谢(?:你)?)?[\s,.!?，。！？～~]*(?:(?:👋\p{Emoji_Modifier}?|:wave:(?::skin-tone-[2-6]:)?)[\s,.!?，。！？～~]*)?$/iu;
const acknowledgment =
  /^(?:ok(?:ay)?|got it|noted|收到|明白(?:了)?|好(?:的)?|了解|嗯+|赞|👍\p{Emoji_Modifier}?|✅|:thumbsup:|:\+1:)(?:[\s,.!?，。！？]+(?:thanks|thank you|谢谢(?:你)?))?[\s,.!?，。！？]*$/iu;
const otherAddress = /<@[^>]+>|<!subteam\^|<!(?:channel|here|everyone)>/u;
const status = /^(?:\/?status|状态|查状态|什么进度|进展如何|进度如何|现在什么进度)$/iu;
const resume = /^(?:\/?unmute|resume replies|恢复回复|取消静音)$/iu;
const settings = [
  [/^(?:\/?mute|mute (?:this thread|replies)|stop replying|(?:先)?别回复(?:了)?|静音)$/iu, { mode: 'muted' }],
  [
    /^(?:\/?mention-only|only @(?:mentioned)?|only when (?:tagged|mentioned|@mentioned)|(?:只|仅)在?被?\s*@\s*(?:时|才)?(?:回复|响应))$/iu,
    { mode: 'mention-only' },
  ],
  [/^(?:\/?progress\s+on|(?:开启|打开)(?:实时)?进度|进度\s*开)$/iu, { progress: true }],
  [/^(?:\/?progress\s+off|关闭(?:实时)?进度|进度\s*关)$/iu, { progress: false }],
];

export function decideDialog(event, state = {}) {
  if (event.isBot || !event.userId || !['message', 'mention'].includes(event.kind)) {
    return { action: 'ignore' };
  }

  const addressed = event.kind === 'mention' || event.mentioned === true;
  const text = (event.text ?? '').trim();
  // An explicit aside to human teammates in a joined thread does not address the bot.
  if (!addressed && /^(?:给(?:其他|各位)同事|同事们[，,:：]|for (?:my |the )?(?:other )?teammates?\b|team only[,:]|no (?:bot )?reply (?:needed|required)\b)/iu.test(text)) return { action: 'ignore' };
  const following =
    state.mode === 'active' &&
    event.userId === state.participantId &&
    event.threadTs &&
    event.ts &&
    event.threadTs !== event.ts &&
    !otherAddress.test(text);
  if (!addressed && !following) return { action: 'ignore' };

  const participant = { mode: 'active', participantId: event.userId };
  if (!event.files?.length) {
    if (acknowledgment.test(text)) return { action: 'ignore' };
    if (
      /^(?:不用(?:再)?(?:同步|汇报)(?:进度)?了?|别刷进度|stop (?:the )?updates|no more updates)[.!。！]?$/iu.test(
        text,
      )
    )
      return { action: 'control', patch: { progress: false } };
    if (
      /^(?:请)?(?:有(?:什么)?(?:新)?(?:进展|进度)(?:就)?(?:自己|主动|及时)?(?:告诉我|通知我|汇报)(?:一下)?|(?:开始)?(?:适当|主动)(?:同步|汇报)(?:进度)?|(?:then )?keep me (?:updated|posted)(?: here)?)[.!。！]?$/iu.test(
        text,
      )
    )
      return { action: 'control', patch: { progress: true, mode: 'active', participantId: event.userId } };
    if (status.test(text)) return { action: 'status' };
    const controlText = text.replace(/[.!。！]+$/u, '').trimEnd();
    if (resume.test(controlText)) return { action: 'control', patch: participant };
    const setting = settings.find(([pattern]) => pattern.test(controlText));
    if (setting) return { action: 'control', patch: { ...setting[1] } };
    if (greeting.test(text)) return { action: 'ignore' };
  }

  if (state.mode === 'muted') return { action: 'ignore' };
  if (
    addressed &&
    state.mode !== 'mention-only' &&
    (state.mode !== 'active' || state.participantId !== event.userId)
  ) {
    return { action: 'forward', patch: participant };
  }
  return { action: 'forward' };
}
