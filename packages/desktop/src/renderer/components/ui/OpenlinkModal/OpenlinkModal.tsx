import React from 'react'

import { styled, useTheme } from '@mui/material/styles'

import { AutoSizer } from 'react-virtualized'
import { Scrollbars } from 'rc-scrollbars'

import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import Checkbox from '@mui/material/Checkbox'
import red from '@mui/material/colors/red'
import Button from '@mui/material/Button'

import Icon from '../Icon/Icon'
import exclamationMark from '../../../static/images/exclamationMark.svg'
import Modal from '../Modal/Modal'

const PREFIX = 'OpenlinkModal'

const classes = {
  icon: `${PREFIX}icon`,
  title: `${PREFIX}title`,
  message: `${PREFIX}message`,
  bold: `${PREFIX}bold`,
  checkboxLabel: `${PREFIX}checkboxLabel`,
  checkboxes: `${PREFIX}checkboxes`,
  buttonBack: `${PREFIX}buttonBack`,
  buttons: `${PREFIX}buttons`,
}

const StyledModalContent = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(4),

  [`& .${classes.icon}`]: {
    fontSize: '10rem',
    color: red[500],
    width: 80,
    height: 70,
  },

  [`& .${classes.title}`]: {
    marginTop: 36,
    marginBottom: 24,
  },

  [`& .${classes.message}`]: {
    wordBreak: 'break-word',
    marginTop: 16,
    fontWeight: 500,
  },

  [`& .${classes.bold}`]: {
    fontWeight: 600,
  },

  [`& .${classes.checkboxLabel}`]: {
    fontSize: 14,
    lineHeight: '24px',
    wordBreak: 'break-word',
  },

  [`& .${classes.checkboxes}`]: {
    marginTop: 32,
  },

  [`& .${classes.buttonBack}`]: {
    width: 147,
    height: 60,
    backgroundColor: theme.palette.colors.quietBlue,
    color: theme.palette.colors.white,
    '&:hover': {
      backgroundColor: theme.palette.colors.quietBlue,
    },
  },

  [`& .${classes.buttons}`]: {
    marginTop: 24,
  },
}))

interface OpenLinkModalProps {
  open: boolean
  handleClose: () => void
  handleConfirm: () => void
  url: string
  addToWhitelist: (url: string, dontAutoload: boolean) => void
  setWhitelistAll: (allowAllLink: boolean) => void
  isImage?: boolean
}

export const OpenlinkModal: React.FC<OpenLinkModalProps> = ({
  open,
  handleClose,
  handleConfirm,
  url = 'https://tryquiet.org/',
  addToWhitelist,
  setWhitelistAll,
  isImage = false,
}) => {
  const [allowThisLink, setAllowThisLink] = React.useState(false)
  const [allowAllLink, setAllowAllLink] = React.useState(false)
  const [dontAutoload, setDontAutoload] = React.useState(false)

  const theme = useTheme()

  const uri = new URL(url)

  return (
    <Modal open={open} handleClose={handleClose} title=''>
      <AutoSizer>
        {({ width, height }) => (
          <Scrollbars autoHideTimeout={500} style={{ width: width, height: height }}>
            <StyledModalContent container justifyContent='flex-start' direction='column'>
              <Grid item container direction='column' alignItems='center'>
                <Icon className={classes.icon} src={exclamationMark} />
                <Typography variant='h2' className={classes.title}>
                  Watch out!
                </Typography>
              </Grid>
              <Grid item container direction='column'>
                <Grid item>
                  <Typography variant='body2'>
                    Opening link posted in Quiet reveals data about you to your goverment, your Internet provider, the
                    site you are visiting and, potentially, to whoever posted the link. Only open links from people you
                    trust. If you are using Quiet to protect your anonymity, never open links.
                  </Typography>
                </Grid>
              </Grid>
              <Grid item container spacing={0} direction='column' className={classes.checkboxes}>
                {' '}
                {isImage ? (
                  <>
                    <Grid item container justifyContent='center' alignItems='center'>
                      <Grid item>
                        <Checkbox
                          checked={allowThisLink}
                          onChange={e => setAllowThisLink(e.target.checked)}
                          color='primary'
                        />
                      </Grid>
                      <Grid item xs className={classes.checkboxLabel}>
                        {'Automatically load images from '}
                        <span className={classes.bold}>{uri.hostname}</span>
                        {"- I trust them with my data and I'm not using Quiet for anonymity protection. "}
                      </Grid>
                    </Grid>
                    <Grid item container justifyContent='center' alignItems='center'>
                      <Grid item>
                        <Checkbox
                          checked={dontAutoload}
                          onChange={e => setDontAutoload(e.target.checked)}
                          color='primary'
                        />
                      </Grid>
                      <Grid item xs className={classes.checkboxLabel}>
                        {"Don't warn me about "}
                        <span className={classes.bold}>{uri.hostname}</span> {"again, but don't auto-load images."}
                      </Grid>
                    </Grid>
                  </>
                ) : (
                  <Grid item container justifyContent='center' alignItems='center'>
                    <Grid item>
                      <Checkbox
                        checked={allowThisLink}
                        onChange={e => setAllowThisLink(e.target.checked)}
                        color='primary'
                      />
                    </Grid>
                    <Grid item xs className={classes.checkboxLabel}>
                      {"Don't warn me about "}
                      <span className={classes.bold}>{uri.hostname}</span> {'again'}
                    </Grid>
                  </Grid>
                )}
                <Grid item container justifyContent='center' alignItems='center'>
                  <Grid item>
                    <Checkbox
                      checked={allowAllLink}
                      onChange={e => setAllowAllLink(e.target.checked)}
                      color='primary'
                    />
                  </Grid>
                  <Grid item xs className={classes.checkboxLabel}>
                    {'Never warn me about outbound links on Quiet.'}
                  </Grid>
                </Grid>
                <Grid item container spacing={2} alignItems='center' className={classes.buttons}>
                  <Grid item>
                    <Button
                      className={classes.buttonBack}
                      variant='contained'
                      color='primary'
                      size='large'
                      onClick={() => {
                        handleClose()
                      }}
                    >
                      Back to safety
                    </Button>
                  </Grid>
                  <Grid item xs>
                    <a
                      style={{
                        color: theme.palette.colors.lushSky,
                        textDecoration: 'none',
                        wordBreak: 'break-all',
                      }}
                      onClick={e => {
                        e.preventDefault()
                        handleConfirm()
                        if (allowThisLink || dontAutoload) {
                          addToWhitelist(url, dontAutoload)
                        }
                        setWhitelistAll(allowAllLink)
                        handleClose()
                      }}
                      href={''}
                    >
                      {isImage ? `Load image from site ${uri.hostname}` : `Continue to ${uri.hostname}`}
                    </a>
                  </Grid>
                </Grid>
              </Grid>
            </StyledModalContent>
          </Scrollbars>
        )}
      </AutoSizer>
    </Modal>
  )
}

export default OpenlinkModal
