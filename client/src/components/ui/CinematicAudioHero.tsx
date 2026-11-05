import React from 'react'
import { ImmersiveHeroBackground, type ImmersiveHeroBackgroundProps } from '../effects/ImmersiveHeroBackground'

/**
 * Legacy alias for ImmersiveHeroBackground
 */
export const CinematicAudioHero: React.FC<ImmersiveHeroBackgroundProps> = (props) => {
  return <ImmersiveHeroBackground {...props} />
}

export default CinematicAudioHero
