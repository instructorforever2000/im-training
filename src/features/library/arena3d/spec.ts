// The scene description a drill turns into — pure data, no three.js. Units: metres; origin = centre of the venue;
// X runs along the length (goals at ±L/2), Z across the width, the main camera sits on the +Z side.
export type Venue = "football" | "futsal" | "basketball" | "handball" | "volleyball" | "hall" | "gym"
export type Team = "a" | "b" | "n" | "gk" | "gkb" | "coach" | "ath"
export type BallKind = "football" | "futsal" | "basketball" | "volleyball" | "handball" | "med" | "light"
export type PropKind =
  | "cone" | "disc" | "pole" | "hurdle" | "ladder" | "miniGoal" | "goal" | "mannequin" | "ball" | "hoop" | "rope"
  | "bench" | "box" | "barbell" | "dumbbell" | "rack" | "cable" | "machine" | "bars" | "dipBars" | "swissBall" | "mat"
  | "wall" | "stick" | "beam" | "pad" | "band" | "board"

export interface Player {
  readonly x: number
  readonly z: number
  /** facing in degrees: 0 = +X (towards the right goal), 90 = +Z (towards the camera) */
  readonly face: number
  readonly pose: string
  readonly team: Team
  /** ball at the feet / in the hands */
  readonly ball?: "feet" | "hands" | "hand"
  /** what the hands hold */
  readonly hold?: "barbell" | "dumbbells" | "dumbbell" | "stick" | "med" | "cable"
  readonly scale?: number
}
export interface Prop {
  readonly kind: PropKind
  readonly x: number
  readonly z: number
  /** rotation about Y in degrees */
  readonly rot?: number
  readonly color?: number
  /** size: goal width, ladder length, mat length… */
  readonly size?: number
  readonly ball?: BallKind
  readonly y?: number
}
export interface Arrow {
  readonly from: readonly [number, number]
  readonly to: readonly [number, number]
  readonly type: "pass" | "run" | "dribble" | "shot"
  /** bend: 0 straight, ± curves to either side */
  readonly bend?: number
}
export interface Area {
  readonly x: number
  readonly z: number
  readonly w: number
  readonly d: number
  /** split into equal zones along the length */
  readonly zones?: number
  /** end zones depth */
  readonly ends?: number
  readonly color?: number
}
export interface Spec {
  readonly venue: Venue
  readonly ball: BallKind
  readonly players: readonly Player[]
  readonly props: readonly Prop[]
  readonly arrows: readonly Arrow[]
  readonly areas: readonly Area[]
  /** what the camera frames: centre + size */
  readonly focus: { readonly x: number; readonly z: number; readonly w: number; readonly d: number }
  /** close-up of one athlete (exercise) instead of a field view */
  readonly close?: boolean
}
