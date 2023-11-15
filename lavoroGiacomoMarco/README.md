# Lavoro di Giacomo e Marco per il progetto SEED

## Scopo
Si ha un RPi in cui è installato un broker MQTT (aedes) in cui vari client MQTT si sottoscrivono ad alcuni topic e cominciano a mandare messaggi.
Lo scopo del progetto è utilizzare Falco per tracciare i pacchetti inviati al broker per poi essere mandati in formato JSON ad un Monitor, il quale riconoscerà se il traffico è maligno o meno.

## Prerequisiti

- Falco installato e configurato correttamente per restituire i log su stdout
- Node.js 
- NPM per installare i moduli utilizzati:
    - aedes
    - ws
    - mqtt
    - mqtt-packet


## Contenuto

Questa parte di repo è divisa in tre parti:

- `src/node` per i file per il setup MQTT usato
- `ws` per il server WebSocket ed i vari script per riorganizzare i dati prodotti da Falco ed inviarli al Monitor/Server ws locale
- `falco` varie regole usate per produrre diversi tipi di output
    - `output` output prodotti con varie regole

`decode_buffer.js` viene usato per parsare gli output di Falco, togliendo informazioni superfule e decodificando il buffer contenente le richieste MQTT in modo da poter essere comprese meglio, dopo di che invierà il pacchetto parsato al Monitor/Server ws, rimanendo in ascolto per un'eventuale risposta

## Setup

Per provare ad ottenere degli output si può procedere in questo modo:
- fare partire il server WebSocket con:
    ```
    node ws/ws_server.js
    ```
    creando un server WebSocket locale su `localhost` sulla porta `8080`
- lanciare il broker MQTT con
    ```
    node src/node/aedes.js
    ```
- lanciare uno o più client MQTT che si connetteranno al broker con:
    ```
    node src/node/client<X>.js
    ```
    dove `<X>` va sostituito con il numero del client
- lanciare lo script `run.sh`, il quale lancerà Falco con le regole specificate, scriverà l'output dei log raccolti su stdout, i quali saranno mandati in pipe a `decode_buffer.js`, che procederà ad inviare i dati raccolti al server WebSocket
    
## Problemi/todo
- è possibile che node dia errori sulla verisone utilizzata, noi abbiamo usato `nvm` per cambiare versione di node 
- bisognerebbe migliorare `run.sh` e `decode_buffer.js`, ad esempio aggiungere dei parametri per mettere le varie regole di falco, specificare il server websocket, ecc...
- nel caso di file memory mappati non è possibile intercettare con falco quello che viene scritto
o letto ma solo il fatto che il file è stato aperto e memory mappato. Ad esempio è possibile memory mappare il device relativo al sense hat.
