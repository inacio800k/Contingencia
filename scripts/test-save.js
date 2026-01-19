
async function testSave() {
    console.log('Testing save-rules API...');

    // Simulate payload with e_ou field
    const payload = {
        column_name: 'test_column_saving',
        metric_type: 'individual',
        rules_config: {
            regras: [
                {
                    coluna_contar: 'status',
                    comparar: 'igual',
                    termos: ['Teste'],
                    e_ou: 'OU'
                }
            ],
            apenas_hoje: true,
            coluna_data: 'data',
            tabela_busca: 'registros'
        }
    };

    try {
        const response = await fetch('https://operational-dashboard-ooba6j7xm-800ks-projects.vercel.app/api/admin/save-rules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', data);

    } catch (error) {
        console.error('Error:', error);
    }
}

testSave();
