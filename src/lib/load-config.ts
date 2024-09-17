import fsp from 'fs/promises'
import Joi from 'joi'
import path from 'path'
import { packageDirectory } from 'pkg-dir'

export type Config = {
  outDir: string
}

const rootDir = await packageDirectory()
if(!rootDir) throw new Error('Couldn\'t find react-static-render.config.json')

const configPath = path.join(rootDir, 'react-static-render.config.json')

const configJson = await fsp.readFile(configPath, 'utf8')

const validated = configSchema.validate(JSON.parse(configJson))

if(validated.error){
  throw validated.error
}
if(validated.warning){
  console.warn(validated.warning)
}

const config: Config = validated.value
config.profiles = config.profiles.map(profile => ({...profile, dir: path.resolve(rootDir, profile.dir)}))


export {config}