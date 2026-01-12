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
}

export type Profile = {
    id: string
    role: 'admin' | 'user'
}

export type Metricas = {
    dia: string
    w_ativos: number
    chip: {
        físico_novo: number
        físico_recuperado: number
        virtual: number
    }
    valor: number
    w_existente: number
    criados_pp: any[]
    email_pp: any[]
    troca_proxy_pp: any[]
    ins_recriadas_pp: any[]
    con_vende_nova_pp: any[]
    recon_vende_pp: any[]
    con_waha_pp: any[]
    con_uazapi_pp: any[]
    troca_num_pp: any[]
    verificar: number
    cairam: number
    whats_vendedores: any[]
    whats_call: any[]
}

export type Proxy = {
    id: number
    created_at: string
    operador: string
    dispositivo: string
    codigo_proxy: string
    foi_feito: string
    instancia: string
}

export type CriacaoEmail = {
    id: number
    created_at: string
    operador: string
    email: string
    senha: string
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
}
