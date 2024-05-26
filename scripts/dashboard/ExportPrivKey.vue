<script setup>
import Modal from '../Modal.vue';
import { nextTick, ref, toRefs, watch } from 'vue';
import { translation } from '../i18n.js';
import { downloadBlob } from '../misc';
import KeyPng from '../../assets/key.png';
import { Database } from '../database.js';
import { decrypt } from '../aes-gcm';
import { useWallet } from '../composables/use_wallet.js';

const wallet = useWallet();

const props = defineProps({
    privateKey: String,
    // Note: isJSON should probably be temporary, maybe we have a "Wallet Type" enum that determines the export UI?
    isJSON: Boolean,
    isEncrypted: Boolean,
    show: Boolean,
    reason: String,
});
const { show, reason } = toRefs(props);

const privateKeyRef = ref('****************************************************');
const password = ref('');
const passwordInput = ref(null);

watch(show, (show) => {
    nextTick(() => {
        if (show) passwordInput?.value?.focus();
    });
    if (!show) {
        password.value = '';
        privateKeyRef.value = '****************************************************';
    }
});

const blur = ref(true);

const emit = defineEmits(['close']);

function downloadWalletFile() {
    downloadBlob(props.privateKey, 'wallet.json', 'text/csv;charset=utf-8;');
}

async function sumbit() {
    if(wallet.isEncrypted) {
        const db = await Database.getInstance();
        const account = await db.getAccount();
        const wif = await decrypt(account.encWif, password.value);
        privateKeyRef.value = JSON.parse(wif).mk;
        if(!privateKeyRef.value){
            privateKeyRef.value = 'Decryption failed... Wrong Password?';
        }
    } else {
        privateKeyRef.value = JSON.parse(props.privateKey)?.mk;
    }
}

function close() {
    blur.value = true;
    password.value = '';
    privateKeyRef.value = '****************************************************';
    emit('close');
}
</script>

<template>
    <Teleport to="body">
        <Modal :show="show" modalClass="exportKeysModalColor">
            <template #header>
                <h5 class="modal-title">
                    {{ translation.privateKey }}
                </h5>
                <button
                    type="button"
                    class="close"
                    @click="close()"
                    aria-label="Close"
                    data-testid="closeBtn"
                >
                    <i class="fa-solid fa-xmark closeCross"></i>
                </button>
            </template>
            <template #body>
                <div class="dcWallet-privateKeyDiv text-center">
                    <img :src="KeyPng" /><br />
                    <h3>{{ translation.viewPrivateKey }}</h3>
                    <span class="span1">{{ translation.privateWarning1 }}</span>
                    <span class="span2">{{ translation.privateWarning2 }}</span>
                    <code
                        :class="{ blurred: blur }"
                        data-testid="privateKeyText"
                        >{{ privateKeyRef }}</code
                    >
                </div>
            </template>
            <template #footer>
                <center>
                    <input
                        v-if="wallet.isEncrypted"
                        type="password"
                        ref="passwordInput"
                        v-model="password"
                        :placeholder="translation.walletPassword"
                        style="text-align: center"
                    />
                    <button
                        class="pivx-button-big"
                        @click="sumbit(); blur = false;"
                        data-testid="blurBtn"
                    >
                        <span data-i18n="viewKey" class="buttoni-text"
                            >{{ translation.viewKey }}
                        </span>
                    </button>
                    <!--<button
                        v-if="isJSON"
                        class="pivx-button-big"
                        @click="downloadWalletFile()"
                    >
                        <span data-i18n="saveWalletFile" class="buttoni-text"
                            >{{ translation.saveWalletFile }}
                        </span>
                    </button>-->
                </center>
            </template>
        </Modal>
    </Teleport>
</template>
