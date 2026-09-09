import { sourceAt, type Project } from "./project";

/** Map the media clock to the retained clip; cuts explicitly seek the next clip. */
export function previewTransport(
  project: Project,
  position: number,
  media: { time: number; seeking: boolean; ready: boolean; ended: boolean },
  loop: boolean,
): { position: number; seek?: number; ended: boolean } {
  const current = sourceAt(project, position);
  if (!current || media.seeking || !media.ready || !Number.isFinite(media.time))
    return { position, ended: false };
  const { segment, index, offset } = current;
  if (media.time >= segment.end || media.ended) {
    const next = project.segments[index + 1];
    if (next)
      return {
        position: offset + (segment.end - segment.start) / segment.speed,
        seek: next.start,
        ended: false,
      };
    if (loop)
      return { position: 0, seek: project.segments[0].start, ended: false };
    return {
      position: offset + (segment.end - segment.start) / segment.speed,
      ended: true,
    };
  }
  return {
    position: offset + Math.max(0, media.time - segment.start) / segment.speed,
    ended: false,
  };
}
