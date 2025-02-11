import React, { useState } from 'react'
import { styled } from '@mui/material/styles'

import CloseIcon from '@mui/icons-material/Close'
import { imagesExtensions } from '@quiet/state-manager'
import Tooltip from '../../ui/Tooltip/Tooltip'
import Icon from '../../ui/Icon/Icon'
import fileIcon from '../../../static/images/fileIcon.svg'
import { FileContent, FilePreviewData } from '@quiet/types'

const PREFIX = 'UploadFilesPreviewsComponent'

const classes = {
  inputFiles: `${PREFIX}inputFiles`,
  wrapper: `${PREFIX}wrapper`,
  image: `${PREFIX}image`,
  fileIcon: `${PREFIX}fileIcon`,
  fileIconContainer: `${PREFIX}fileIconContainer`,
  closeIconContainer: `${PREFIX}closeIconContainer`,
  closeIcon: `${PREFIX}closeIcon`,
  imageContainer: `${PREFIX}imageContainer`,
  tooltip: `${PREFIX}tooltip`,
}

const StyledFilePreviewComponent = styled('div')(({ theme }) => ({
  display: 'inline-block',
  float: 'left',
  cursor: 'pointer',

  [`& .${classes.wrapper}`]: {
    margin: '0 0 10px 10px',
    width: '64px',
    height: '64px',
  },

  [`& .${classes.image}`]: {
    width: '64px',
    height: '64px',
    borderRadius: '15%',
    objectFit: 'cover',
  },

  [`& .${classes.fileIcon}`]: {
    width: '32px',
    height: '40px',
  },

  [`& .${classes.fileIconContainer}`]: {
    width: '64px',
    height: '64px',
    borderRadius: '15%',
    backgroundColor: theme.palette.background.paper,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  [`& .${classes.closeIconContainer}`]: {
    position: 'absolute',
    margin: '0 0 0 51px', // Left margin is equal fileContainer width minus half the own width
    padding: '0',
    backgroundColor: theme.palette.background.default,
    borderRadius: '100%',
    width: '22px',
    height: '22px',
    transform: 'translate(50%, -50%)',
    '&:hover': {
      backgroundColor: '#dddddd',
    },
  },

  [`& .${classes.closeIcon}`]: {
    position: 'relative',
    left: '50%',
    top: '50%',
    color: '#444444',
    transform: 'translate(-50%, -50%)',
    '&:hover': {
      color: '#000000',
    },
    width: '17px',
  },

  [`& .${classes.tooltip}`]: {
    marginTop: '8px',
  },
}))

const StyledUploadFilesPreviewsComponent = styled('div')(() => ({
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'flexStart',
  alignItems: 'baseline',
  alignContent: 'stretch',
  paddingRight: '50px',
}))

export interface FilePreviewComponentProps {
  fileData: FileContent
  onClick: () => void
}

const FilePreviewComponent: React.FC<FilePreviewComponentProps> = ({ fileData, onClick }) => {
  const [showClose, setShowClose] = useState(false)
  const imageType = imagesExtensions.includes(fileData.ext)

  return (
    <StyledFilePreviewComponent
      onMouseLeave={() => {
        setShowClose(false)
      }}
      onMouseOver={() => {
        setShowClose(true)
      }}
    >
      {showClose && (
        <div className={classes.closeIconContainer} onClick={onClick}>
          <CloseIcon className={classes.closeIcon} />
        </div>
      )}
      <Tooltip title={`${fileData.name}${fileData.ext}`} placement='top' className={classes.tooltip}>
        <div className={classes.wrapper}>
          {imageType && fileData.path ? (
            <img src={fileData.path} alt={fileData.name} className={classes.image} />
          ) : (
            <div className={classes.fileIconContainer}>
              <Icon src={fileIcon} className={classes.fileIcon} />
            </div>
          )}
        </div>
      </Tooltip>
    </StyledFilePreviewComponent>
  )
}

export interface UploadFilesPreviewsProps {
  filesData: FilePreviewData
  removeFile: (id: string) => void
}

const UploadFilesPreviewsComponent: React.FC<UploadFilesPreviewsProps> = ({ filesData, removeFile }) => {
  return (
    <StyledUploadFilesPreviewsComponent>
      {Object.entries(filesData).map(fileData => (
        <FilePreviewComponent key={fileData[0]} fileData={fileData[1]} onClick={() => removeFile(fileData[0])} />
      ))}
    </StyledUploadFilesPreviewsComponent>
  )
}

export default UploadFilesPreviewsComponent
