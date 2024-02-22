FROM ubuntu

COPY build/dayz-server-manager /usr/local/bin/

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y libcap-dev lib32gcc-s1 libcurl4  libcurl4-openssl-dev && \
    apt-get clean && \
    mkdir /dayz && \
    groupadd --gid 1001 dayz && \
    useradd --uid 1001 --gid 1001 --system -m -d /dayz -s /bin/bash dayz && \
    chown dayz:dayz /dayz && \
    chmod +x  /usr/local/bin/dayz-server-manager

WORKDIR /dayz
USER dayz

VOLUME /dayz/

CMD [ "dayz-server-manager" ]