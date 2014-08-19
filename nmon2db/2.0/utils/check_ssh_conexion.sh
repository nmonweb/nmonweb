#!/usr/bin/ksh93
# Programa para habilitar le servicio SSH privilegiado en una máquina AIX
#set -x


deployToServer() {
    echo "Deployng to $1@$2 from $3"
    if [ -z "`cat ~/.ssh/known_hosts | grep $2`" ] && [ -z "`ssh-keygen -F $2`" ]
    then
        echo 'Auto accepting SSH key'
        scp -oStrictHostKeyChecking=no $3* $1@$2:.
    else
        echo "CORRECTO"
    fi
}

# Comprobamos primero el número de parámetros enviados
lista=$1
if [[ -z $lista ]]; then
    echo "`basename $0` <fichero_lista_servidores>"
    exit 1
fi
if [[ ! -f $lista ]]; then
    echo "El fichero indicado no existe"
    exit 2
fi

# Por cada servidor de la lista ....
cat $lista  | grep -v ^# | while read server
do
    # Comprobamos si tenemos conexión con el servidor
    ping -c 1 -w 5 $server > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "$server \tNO DISPONIBLE"
        continue
    fi
    /usr/bin/ssh -oStrictHostKeyChecking=no -f -n -q $server "echo hola > /dev/null"
    if [ $? -ne 0 ]; then
        echo "$server \tSIN ACCESO"
        continue
    fi
    echo "$server \tCORRECTO"
done



