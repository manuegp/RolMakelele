/**
 * Configuración del servidor
 */

interface ServerConfig {
  port: number;
  corsOrigin: string | string[];
  maxPlayersPerRoom: number;
  maxSpectatorsPerRoom: number;
  maxCharactersPerPlayer: number;
  turnTimeLimit: number; // en segundos
  charactersDataPath: string;
  postmanCollectionPath: string;
}

const config: ServerConfig = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  maxPlayersPerRoom: 2,
  maxSpectatorsPerRoom: 5,
  maxCharactersPerPlayer: 4,
  turnTimeLimit: 30,
  charactersDataPath: './data/characters.json',
  postmanCollectionPath: './data/rolmakelele_postman_collection.json'
};

export default config;

