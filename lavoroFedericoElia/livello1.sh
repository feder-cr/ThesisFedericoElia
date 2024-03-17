#!/bin/bash

# Controlla se sono stati forniti argomenti per il numero di iterazioni e la durata
if [ $# -ne 2 ]; then
    echo "Usage: $0 <numero_iterazioni> <durata_iterazione>"
    exit 1
fi

echo "Inizio dello script di monitoraggio delle prestazioni di livello1"

# Definizione del percorso della cartella di output e creazione della cartella
OUTPUT_DIR="./livello1"
mkdir -p $OUTPUT_DIR
echo "Cartella $OUTPUT_DIR creata per i file di output."

# Avvio di Falco in background
echo "Avvio di Falco in background."
sudo falco -c falco/falco.yaml -r falco/log_server.yaml -r falco/sense-hat.yaml -b -A -S 4000 > /dev/null 2>&1 &
FALCO_PID=$!
echo "Falco avviato con PID $FALCO_PID."

# Avvio node clientSubSenseHat.js in background
echo "Avvio di node clientSubSenseHat.js in background."
node clientSubSenseHat.js &
NODE_PID=$!
echo "Processo Node.js avviato con PID $NODE_PID."

# Pausa di 10 secondi per dare tempo ai processi di inizializzare
echo "Attesa di 10 secondi per permettere l'inizializzazione dei processi."
sleep 10

# Definizione del numero di iterazioni e della durata di ogni campionamento
ITERATIONS=$1
DURATION=$2
echo "Inizio del ciclo di monitoraggio. Numero di iterazioni: $ITERATIONS. Durata di ogni iterazione: $DURATION secondi."

for i in $(seq 1 $ITERATIONS); do
    echo "Inizio iterazione $i."

    # Avvia mpstat in background per registrare l'uso della CPU
    mpstat 1 $DURATION > "$OUTPUT_DIR/mpstat_output_$i.txt" &
    MPSTAT_PID=$!

    # Avvia perf in background per monitorare il sistema
    perf stat -a -e instructions,cycles -o "$OUTPUT_DIR/perf_output_$i.txt" sleep $DURATION &
    PERF_PID=$!

    # Avvia perf in background per monitorare clientSubSenseHat.js
    perf stat -p $NODE_PID -e instructions,cycles -o "$OUTPUT_DIR/perf_node_output_$i.txt" sleep $DURATION &
    PERF_NODE_PID=$!

    # Aspetta che il campionamento di DURATION secondi finisca per ogni processo
    wait $MPSTAT_PID
    wait $PERF_PID
    wait $PERF_NODE_PID

    echo "Fine iterazione $i"
done

# Opzionale: termina Falco alla fine dello script
kill $FALCO_PID
kill $NODE_PID
echo "Falco terminato."

