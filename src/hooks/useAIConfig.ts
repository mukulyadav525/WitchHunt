import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAIConfigStore } from '../store/aiConfigStore';
import { AIConfiguration } from '../types';

export function useAIConfig() {
    const { configs, setConfigs, setLoading } = useAIConfigStore();

    useEffect(() => {
        loadConfigs();
    }, []);

    async function loadConfigs() {
        setLoading(true);
        const { data, error } = await supabase
            .from('ai_configurations')
            .select('*')
            .eq('is_active', true);

        if (data) {
            const configMap = data.reduce((acc, cfg) => {
                acc[cfg.config_key] = cfg;
                return acc;
            }, {} as Record<string, AIConfiguration>);
            setConfigs(configMap);
        }
        setLoading(false);
    }

    return { configs, reload: loadConfigs };
}
