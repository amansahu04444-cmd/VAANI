import React from 'react'
import { AmbientSoundEnvironment, type AmbientSoundEnvironmentProps } from './AmbientSoundEnvironment'

/**
 * Legacy alias for AmbientSoundEnvironment
 */
export const CinematicAudioHero: React.FC<AmbientSoundEnvironmentProps> = (props) => {
  return <AmbientSoundEnvironment {...props} />
}

export default CinematicAudioHero
