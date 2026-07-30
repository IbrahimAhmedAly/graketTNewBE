import { IsInt, IsOptional, IsUUID } from 'class-validator';

/** Opens a study session when the app comes to the foreground. */
export class StartSessionDto {
  /**
   * Device UTC offset in minutes. Determines which local day this session's
   * study time is credited to, and therefore whether a streak continues.
   */
  @IsOptional()
  @IsInt()
  tzOffsetMinutes?: number;
}

/**
 * Keeps a session alive. The client sends this on a timer; the server treats a
 * session with no recent heartbeat as abandoned rather than trusting a
 * client-supplied duration, so a phone that dies mid-lesson cannot record
 * hours of study.
 */
export class HeartbeatDto {
  @IsUUID('4', { message: 'sessionId must be a valid id' })
  sessionId: string;
}

/** Closes a session when the app is backgrounded or the student signs out. */
export class EndSessionDto {
  @IsUUID('4', { message: 'sessionId must be a valid id' })
  sessionId: string;
}
