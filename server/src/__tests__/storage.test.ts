import { describe, it, expect } from 'vitest'
import { StorageService } from '../modules/storage/storage.service.js'

describe('Private Storage Security & Signed URL Expiration', () => {
  it('generates a 15-minute signed URL for valid user-owned object path', async () => {
    const userId = 'user-test-123'
    const objectKey = `${userId}/speech-audio.wav`

    const { signedUrl, expiresAt } = await StorageService.getSignedUrl(
      'generated-audio',
      objectKey,
      userId,
      900 // 15 minutes
    )

    expect(signedUrl).toBeDefined()
    expect(signedUrl).toContain(objectKey)

    // Verify expiration timestamp is approximately 15 minutes in future
    const expirationDate = new Date(expiresAt).getTime()
    const expectedTime = Date.now() + 900 * 1000
    expect(Math.abs(expirationDate - expectedTime)).toBeLessThan(5000)
  })

  it('strictly blocks signed URL generation if object key belongs to another user', async () => {
    const userA = 'user-a'
    const targetKeyBelongingToUserB = 'user-b/confidential-recording.wav'

    await expect(
      StorageService.getSignedUrl('generated-audio', targetKeyBelongingToUserB, userA)
    ).rejects.toThrow('FORBIDDEN_OBJECT_ACCESS')
  })

  it('blocks deletion of storage objects belonging to another user', async () => {
    const userA = 'user-a'
    const userBKey = 'user-b/confidential-sample.wav'

    await expect(
      StorageService.deleteObject('voice-samples', userBKey, userA)
    ).rejects.toThrow('FORBIDDEN_OBJECT_ACCESS')
  })
})

