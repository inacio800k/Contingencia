export type Registro = {
    id: number
    data: string
    operador: string
    tipo_de_conta: string
    dispositivo: string
    instancia: string
    numero: string
    codigo: string
    status: string
    info: string
    obs: string
    tipo_chip: string
    valor: string
    waha_dia: string
    caiu_dia: string
    ultima_att: string
    tokens_uazapi: string
}



export type ValoresAtuais = {
    num_normal: number
    num_business: number
    clone_normal: number
    clone_business: number
    num_gb: number
}

export type ZapsSobrando = {
    'Whats': number
    'Whats Business': number
    'Clone Whats': number
    'Clone Business': number
    'Whats GB': number
}

export type Dispositivo = {
    dispositivo: string
    num_business: number
    num_gb: number
    valores_atuais: Record<string, ValoresAtuais>
    zaps_sobrando: Record<string, Partial<ZapsSobrando>>
    ideal_0: Record<string, ValoresAtuais> // Reusing ValoresAtuais as structure is identical (num_normal, etc)
}
