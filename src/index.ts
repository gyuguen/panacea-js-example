import {  panaceaWalletOpts, SigningPanaceaClient } from "@medibloc/panacea-js";
import {DirectSecp256k1HdWallet} from "@cosmjs/proto-signing";
import { assertIsDeliverTxSuccess } from "@cosmjs/stargate";
import { TxMsgData } from "cosmjs-types/cosmos/base/abci/v1beta1/abci";
import axios from "axios"
import {MsgAddRecordResponse} from "@medibloc/panacea-js/dist/proto/panacea/aol/v2/tx";

const generateRandomString = (num: number) => {
    const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < num; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

window.onload = async () => {
    const mnemonic = "effort kite tell stuff beauty chest bag noise verify salute laundry eyebrow rally main plunge dwarf venue chief sing vicious lend napkin raccoon airport";
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, panaceaWalletOpts);
    const [firstAccount] = await wallet.getAccounts();

    // Testnet: https://testnet-rpc.gopanacea.org
    // Mainnet: https://rpc.gopanacea.org
    const tendermintRpcEndpoint = "http://localhost:26657";
    const client = await SigningPanaceaClient.connectWithSigner(tendermintRpcEndpoint, wallet);

    const ownerAddress = firstAccount.address;
    const topicName = generateRandomString(10)
    let result = await client.createTopic(ownerAddress, topicName, "description", "auto", "memo");
    assertIsDeliverTxSuccess(result);

    const writerAddress = ownerAddress;
    result = await client.addWriter(ownerAddress, topicName, writerAddress, "moniker", "description", "auto", "memo");
    assertIsDeliverTxSuccess(result);

    const writer = await client.getPanaceaClient().getWriter(ownerAddress, topicName, writerAddress);
    console.log(writer);

    // AddRecord part
    const key = new TextEncoder().encode("key1");
    const value = new TextEncoder().encode("value1");

    result = await client.addRecord(ownerAddress, topicName, key, value, writerAddress, "auto", "memo")

    let responses = await getMsgAddRecordResponses(result.transactionHash)
    // Only one array value response
    console.log(responses[0].topicName, responses[0].ownerAddress, responses[0].offset)

    result = await client.addRecord(ownerAddress, topicName, key, value, writerAddress, "auto", "memo")

    responses = await getMsgAddRecordResponses(result.transactionHash)
    // Only one array value response
    console.log(responses[0].topicName, responses[0].ownerAddress, responses[0].offset)
}

const getMsgAddRecordResponses = async (txHash: string): Promise<MsgAddRecordResponse[]> => {
    const responses: MsgAddRecordResponse[] = [];

    const txMsgData = await getDataFromTxResponse(txHash)
    for (const msgData of txMsgData.data) {
        responses.push(MsgAddRecordResponse.decode(msgData.data))
    }
    return responses
}

async function getDataFromTxResponse(txHash: string): Promise<TxMsgData> {
    // Testnet: https://testnet-api.gopanacea.org
    // Mainnet: https://api.gopanacea.org
    const res = await axios.get(`http://localhost:1317/cosmos/tx/v1beta1/txs/${txHash}`);
    const data = hexStringToByteArray(res.data.tx_response.data);
    return TxMsgData.decode(data);
}

function hexStringToByteArray(hexString: string) {
    if (hexString.length % 2 !== 0) {
        throw "Must have an even number of hex digits to convert to bytes";
    }/* w w w.  jav  a2 s .  c o  m*/
    let numBytes = hexString.length / 2;
    let byteArray = new Uint8Array(numBytes);
    for (let i=0; i<numBytes; i++) {
        byteArray[i] = parseInt(hexString.substr(i*2, 2), 16);
    }
    return byteArray;
}