# RolMakelele - Juego de Rol por Turnos

Servidor para un juego de rol por turnos usando Socket.IO, Node.js, Express y TypeScript.

## Características

- Sistema de salas con máximo 2 jugadores y 5 espectadores
- Selección de 4 personajes por jugador
- Estadísticas de personajes (velocidad, vida, ataque, defensa)
- Sistema de turnos basado en la velocidad
- Habilidades con efectos variados (daño, curación, buffs, debuffs)
- Sistema de chat

## Requisitos

- Node.js (versión 14 o superior)
- npm (versión 6 o superior)

## Instalación

1. Clona este repositorio
2. Instala las dependencias con `npm install`
3. Inicia el servidor en modo desarrollo con `npm run dev`
4. Para producción, compila con `npm run build` y luego inicia con `npm start`

## Conexión con Postman

Se incluye una colección de Postman en `data/rolmakelele_postman_collection.json` para probar todos los eventos del servidor.

## Estructura del Proyecto

```
RolMakelele/
├── data/
│   ├── characters.json          # Datos de los personajes
│   └── rolmakelele_postman_collection.json # Colección de Postman
├── src/
│   ├── config/
│   │   └── config.ts            # Configuración del servidor
│   ├── models/
│   │   └── character.model.ts   # Modelo de personaje
│   ├── types/
│   │   ├── game.types.ts        # Tipos de datos del juego
│   │   └── socket.types.ts      # Tipos para eventos de Socket.IO
│   └── index.ts                 # Punto de entrada de la aplicación
├── package.json
├── tsconfig.json
└── README.md
```

## Reglas del Juego

1. Cada jugador selecciona 4 personajes
2. El orden de los turnos se determina por la velocidad de los personajes
3. En cada turno, un jugador puede usar una habilidad con uno de sus personajes
4. Las habilidades pueden tener diversos efectos (daño, curación, buffs, debuffs)
5. El juego termina cuando todos los personajes de un jugador son derrotados

## Eventos de Socket.IO

### Eventos del Cliente al Servidor

- `join_room`: Unirse a una sala
- `create_room`: Crear una sala
- `leave_room`: Abandonar una sala
- `select_characters`: Seleccionar personajes
- `ready`: Marcar como listo
- `perform_action`: Realizar una acción en el juego
- `join_as_spectator`: Unirse como espectador
- `chat_message`: Enviar mensaje de chat

### Eventos del Servidor al Cliente

- `rooms_list`: Lista de salas disponibles
- `room_joined`: Confirmación de unión a sala
- `room_updated`: Actualización de estado de sala
- `game_started`: Inicio del juego
- `turn_started`: Inicio de turno
- `action_result`: Resultado de una acción
- `game_ended`: Fin del juego
- `error`: Mensaje de error
- `characters_list`: Lista de personajes disponibles
- `chat_message`: Mensaje de chat recibido

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.

