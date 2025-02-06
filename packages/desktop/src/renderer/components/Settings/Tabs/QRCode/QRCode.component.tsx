import React, { FC } from 'react'

import QR from 'react-qr-code'

import { styled } from '@mui/material/styles'

import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

const PREFIX = 'QRCode'

const classes = {
  codeWrapper: `${PREFIX}codeWrapper`,
  textWrapper: `${PREFIX}textWrapper`,
}

const StyledGrid = styled(Grid)(() => ({
  [`& .${classes.codeWrapper}`]: {
    marginTop: 16,
  },

  [`& .${classes.textWrapper}`]: {
    marginTop: 16,
    width: 340,
  },
}))

export interface QRCodeProps {
  value: string
}

export const QRCodeComponent: FC<QRCodeProps> = ({ value }) => {
  return (
    <StyledGrid container direction='column'>
      <Grid item>
        <Grid item className={classes.codeWrapper}>
          <QR value={value} size={172} />
        </Grid>
        <Grid item container direction='column' className={classes.textWrapper}>
          <Grid item>
            <Typography variant='h5'>Invitation QR code</Typography>
          </Grid>
          <Grid item>
            <Typography variant='body2'>
              This community QR code is private. If it is shared with someone, they can scan it with their camera to
              join this community.
            </Typography>
          </Grid>
        </Grid>
      </Grid>
    </StyledGrid>
  )
}

export default QRCodeComponent
