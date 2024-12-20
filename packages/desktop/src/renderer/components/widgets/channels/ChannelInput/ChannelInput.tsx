import React, { ReactElement, useCallback } from 'react'
import classNames from 'classnames'
import Picker, { EmojiStyle, type Theme } from 'emoji-picker-react'
import Grid from '@mui/material/Grid'
import { styled, useTheme } from '@mui/material/styles'
import orange from '@mui/material/colors/orange'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import ChannelInputInfoMessage from './ChannelInputInfoMessage'
import { INPUT_STATE } from './InputState.enum'
import Icon from '../../../ui/Icon/Icon'
import emojiGray from '../../../../static/images/emojiGray.svg'
import emojiBlack from '../../../../static/images/emojiBlack.svg'
import paperclipGray from '../../../../static/images/paperclipGray.svg'
import paperclipBlack from '../../../../static/images/paperclipBlack.svg'
import path from 'path'

const PREFIX = 'ChannelInput'

const classes = {
  root: `${PREFIX}root`,
  rootContent: `${PREFIX}rootContent`,
  input: `${PREFIX}input`,
  textfield: `${PREFIX}textfield`,
  inputsDiv: `${PREFIX}inputsDiv`,
  disabledBottomMargin: `${PREFIX}disabledBottomMargin`,
  warningIcon: `${PREFIX}warningIcon`,
  blinkAnimation: `${PREFIX}blinkAnimation`,
  backdrop: `${PREFIX}backdrop`,
  focused: `${PREFIX}focused`,
  iconButton: `${PREFIX}iconButton`,
  emoji: `${PREFIX}emoji`,
  highlight: `${PREFIX}highlight`,
  actions: `${PREFIX}actions`,
  picker: `${PREFIX}picker`,
  errorIcon: `${PREFIX}errorIcon`,
  errorBox: `${PREFIX}errorBox`,
  linkBlue: `${PREFIX}linkBlue`,
  notAllowed: `${PREFIX}notAllowed`,
  inputFiles: `${PREFIX}inputFiles`,
  icons: `${PREFIX}icons`,
}

const maxHeight = 300

const StyledChannelInput = styled(Grid)(({ theme }) => ({
  [`&.${classes.root}`]: {
    background: theme.palette.background.default,
    height: '100%',
    width: '100%',
  },
  [`& .${classes.rootContent}`]: {
    background: theme.palette.background.default,
    height: '100%',
    width: '100%',
  },
  '@keyframes blinker': {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  [`& .${classes.input}`]: {
    display: 'block',
    border: 0,
    resize: 'none',
    fontFamily: 'inherit',
    whiteSpace: 'break-spaces',
    width: '100%',
    fontSize: 14,
    outline: 'none',
    padding: '12px 16px',
    scrollPaddingBottom: '12px',
    height: '48px',
    lineHeight: '24px',
    backgroundColor: theme.palette.background.default,
    '&:empty': {
      '&:before': {
        content: 'attr(placeholder)',
        display: 'block',
        color: '#aaa',
      },
    },
    '&::placeholder': {
      color: '#aaa',
    },
    wordBreak: 'break-word',
    position: 'relative',
    paddingRight: '60px',
  },
  [`& .${classes.textfield}`]: {
    border: `1px solid ${theme.palette.colors.border01}`,
    maxHeight: maxHeight,
    overflowY: 'auto',
    borderRadius: 4,
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'nowrap',
    justifyContent: 'flexStart',
    alignItems: 'stretch',
    alignContent: 'stretch',
    width: '100%',
    position: 'relative',
  },
  [`& .${classes.inputsDiv}`]: {
    paddingLeft: '20px',
    paddingRight: '20px',
    width: '100%',
    margin: '0px',
    position: 'relative',
  },
  [`& .${classes.disabledBottomMargin}`]: {
    marginBottom: 0,
  },
  [`& .${classes.warningIcon}`]: {
    color: orange[500],
  },
  [`& .${classes.blinkAnimation}`]: {
    animationName: '$blinker',
    animationDuration: '1s',
    animationTimingFunction: 'linear',
    animationIterationCount: 1,
  },
  [`& .${classes.backdrop}`]: {
    height: 'auto',
    padding: theme.spacing(1),
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    WebkitTapHighlightColor: 'transparent',
    pointerEvents: 'none',
    touchAction: 'none',
  },
  [`& .${classes.iconButton}`]: {
    cursor: 'pointer',
    position: 'relative',
    float: 'right',
    color: '#808080',
    '&:hover': {
      color: 'black',
      border: '1px solid black',
    },
    border: '1px solid #808080',
    // boxShadow: '-.75px -.75px 1px #808080',
    borderRadius: '100%',
    width: '23px',
    height: '23px',
  },
  [`& .${classes.emoji}`]: {
    cursor: 'pointer',
    position: 'relative',
    float: 'right',
  },
  [`& .${classes.highlight}`]: {
    color: theme.palette.colors.lushSky,
    backgroundColor: theme.palette.colors.lushSky12,
    padding: 5,
    borderRadius: 4,
  },
  [`& .${classes.actions}`]: {
    postion: 'relative',
    float: 'right',
    padding: '5px',
  },
  [`& .${classes.picker}`]: {
    position: 'fixed',
    bottom: 60,
    right: 15,
  },
  [`& .${classes.errorIcon}`]: {
    display: 'flex',
    justify: 'center',
    alignItems: 'center',
    marginLeft: 20,
    marginRight: 5,
  },
  [`& .${classes.errorBox}`]: {
    marginTop: 5,
  },
  [`& .${classes.linkBlue}`]: {
    fontWeight: 'normal',
    fontStyle: 'normal',
    cursor: 'pointer',
    color: theme.palette.colors.linkBlue,
  },
  [`& .${classes.notAllowed}`]: {
    cursor: 'not-allowed',
  },
  [`& .${classes.inputFiles}`]: {
    position: 'relative',
    float: 'left',
  },
  [`& .${classes.icons}`]: {
    position: 'absolute',
    float: 'left',
    right: '0px',
    bottom: '0px',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flexStart',
    alignItems: 'center',
    alignCntent: 'stretch',
  },
}))

export interface ChannelInputProps {
  channelId: string
  channelName?: string
  inputPlaceholder: string
  inputState?: INPUT_STATE
  initialMessage?: string
  onChange: (arg: string) => void
  onKeyPress: (input: string) => void
  infoClass: string
  setInfoClass: (arg: string) => void
  children?: ReactElement
  openFilesDialog: () => void
  handleClipboardFiles: (arg: ArrayBuffer, ext: string, name: string) => void
  handleOpenFiles: (arg: { files: any[] }) => void
}

export const ChannelInputComponent: React.FC<ChannelInputProps> = ({
  channelId,
  inputPlaceholder,
  inputState = INPUT_STATE.AVAILABLE,
  initialMessage = '',
  onChange,
  onKeyPress,
  infoClass,
  setInfoClass,
  children,
  openFilesDialog,
  handleClipboardFiles,
  handleOpenFiles,
}) => {
  const textAreaRef = React.createRef<HTMLTextAreaElement>()
  const fileInput = React.useRef<HTMLInputElement>(null)

  const [focused, setFocused] = React.useState(false)

  const [emojiHovered, setEmojiHovered] = React.useState(false)
  const [fileExplorerHovered, setFileExplorerHovered] = React.useState(false)
  const [openEmoji, setOpenEmoji] = React.useState(false)

  const [message, setMessage] = React.useState(initialMessage)

  const theme = useTheme()

  React.useEffect(() => {
    setMessage(initialMessage)
    const ref = textAreaRef.current
    if (!ref) return
    if (!initialMessage) return
    adjustTextAreaHeight(ref)
  }, [channelId])

  React.useEffect(() => {
    textAreaRef.current?.focus()
  }, [textAreaRef])

  const adjustTextAreaHeight = (el: HTMLTextAreaElement) => {
    // Workaround for making textarea's height adapt to the content
    el.style.height = ''
    if (el.scrollHeight > el.clientHeight) {
      el.style.height = `${el.scrollHeight}px`
    }
  }

  const onChangeCb = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (inputState === INPUT_STATE.AVAILABLE) {
        setMessage(e.target.value)
        adjustTextAreaHeight(e.target)
      }
    },
    [onChange]
  )

  const inputStateRef = React.useRef(inputState)
  React.useEffect(() => {
    inputStateRef.current = inputState
  })

  const onKeyDownCb = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.nativeEvent.key === 'Enter') {
        if (e.shiftKey) {
          // Accept this input for additional lines in the message box
        } else if (inputStateRef.current === INPUT_STATE.AVAILABLE) {
          e.preventDefault()
          const target = e.target as HTMLInputElement
          onChange(target.value)
          onKeyPress(target.value)
          setMessage('')
          target.style.height = ''
        } else {
          e.preventDefault()
          if (infoClass !== classNames(classes.backdrop, classes.blinkAnimation)) {
            setInfoClass(classNames(classes.backdrop, classes.blinkAnimation))
            setTimeout(() => setInfoClass(classNames(classes.backdrop)), 1000)
          }
        }
      }
    },
    [inputState, message, onChange, onKeyPress, setMessage, infoClass, setInfoClass]
  )

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement
    if (!target.files) return
    handleOpenFiles({ files: Object.values(target.files) })
  }

  return (
    <StyledChannelInput
      className={classNames({
        [classes.root]: true,
        [classes.notAllowed]: inputState !== INPUT_STATE.AVAILABLE,
      })}
    >
      <Grid
        container
        className={classNames({
          [classes.rootContent]: true,
        })}
        direction='column'
        justifyContent='center'
      >
        <Grid
          container
          direction='row'
          alignItems='center'
          justifyContent='center'
          spacing={0}
          className={classNames({
            [classes.inputsDiv]: true,
          })}
        >
          <ClickAwayListener
            onClickAway={() => {
              setFocused(false)
            }}
          >
            <Grid
              item
              xs
              container
              className={classNames({
                [classes.textfield]: true,
                [classes.focused]: focused,
              })}
              justifyContent='center'
              alignItems='center'
            >
              <textarea
                ref={textAreaRef}
                placeholder={`Message ${inputPlaceholder}`}
                className={classes.input}
                onClick={() => {
                  if (!focused) {
                    setFocused(true)
                  }
                }}
                value={message}
                disabled={inputState !== INPUT_STATE.AVAILABLE}
                onChange={onChangeCb}
                onKeyDown={onKeyDownCb}
                onPaste={async e => {
                  const files = e.clipboardData.files
                  if (files.length) e.preventDefault()
                  for (let i = 0; i < files.length; i++) {
                    const fileExt = path.extname(files[i].name).toLowerCase()
                    const fileName = path.basename(files[i].name, fileExt)
                    const arrayBuffer = await files[i].arrayBuffer()
                    handleClipboardFiles(arrayBuffer, fileExt, fileName)
                  }
                }}
                data-testid='messageInput'
              />
              {children}
              <div className={classes.icons}>
                <Grid item className={classes.actions}>
                  <Grid container justifyContent='center' alignItems='center'>
                    <Icon
                      className={classes.emoji}
                      src={fileExplorerHovered ? paperclipBlack : paperclipGray}
                      onClickHandler={() => fileInput.current?.click()}
                      onMouseEnterHandler={() => {
                        setFileExplorerHovered(true)
                      }}
                      onMouseLeaveHandler={() => {
                        setFileExplorerHovered(false)
                      }}
                    />
                    <input
                      data-testid='uploadFileInput'
                      ref={fileInput}
                      type='file'
                      onChange={handleFileInput}
                      // Value needs to be cleared otherwise one can't upload same image twice
                      onClick={e => {
                        ;(e.target as HTMLInputElement).value = ''
                      }} // TODO: check
                      accept='*'
                      multiple
                      hidden
                    />
                  </Grid>
                </Grid>
                <Grid item className={classes.actions}>
                  <Grid container justifyContent='center' alignItems='center'>
                    <Icon
                      className={classes.emoji}
                      src={emojiHovered ? emojiBlack : emojiGray}
                      onClickHandler={() => {
                        setOpenEmoji(true)
                      }}
                      onMouseEnterHandler={() => {
                        setEmojiHovered(true)
                      }}
                      onMouseLeaveHandler={() => {
                        setEmojiHovered(false)
                      }}
                    />
                  </Grid>
                  {openEmoji && (
                    <ClickAwayListener
                      onClickAway={() => {
                        setOpenEmoji(false)
                      }}
                    >
                      <div data-testid={'emoji-picker'} className={classes.picker}>
                        <Picker
                          onEmojiClick={(emojiData, _event) => {
                            setMessage(message + emojiData.emoji)
                            setOpenEmoji(false)
                          }}
                          // Every other emojiStyle causes downloading emojis from cdn. We do not want that.
                          // Do not change it unless using custom getEmojiUrl with local emojis.
                          emojiStyle={EmojiStyle.NATIVE}
                          theme={theme.palette.mode as Theme}
                        />
                      </div>
                    </ClickAwayListener>
                  )}
                </Grid>
              </div>
            </Grid>
          </ClickAwayListener>
        </Grid>
        <ChannelInputInfoMessage showInfoMessage={inputState !== INPUT_STATE.AVAILABLE} />
      </Grid>
    </StyledChannelInput>
  )
}

export default ChannelInputComponent
