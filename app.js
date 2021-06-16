require('dotenv').config();
const express = require('express');
const request = require('request-promise-native');
const rn = require('random-number');
const Web3Utils = require('web3-utils');
const ethereum_address = require('ethereum-address');
const app = express();
const options = { min:  1000, max:  9999, integer: true }
const headers = {
    'Contenc-type': 'application/json; charset=utf-8',
    'X-Henesis-Secret': process.env.API_SECRET,
    'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
}

app.use(express.json());

app.get("/wallets",async(req,res)=>{
    try {
        const {id:eth_id,address:eth_address} = await request({
            json:true,
            method:"POST",
            uri:`${process.env.ENCLAVE}/api/v3/ethereum/wallets/${process.env.ETH_ID}/deposit-addresses`,
            headers:headers,
            body:{
                name:`test-wallet-${rn(options)}`
            }
        });
        if( eth_id !== undefined ) {
            console.log("create wallet!")
            res.json({result:"success",addr:eth_address,id:eth_id});
        } else {
            res.json({result:"false",msg:"시스템 오류입니다. 다시 시도해 주세요."});
        }
    } catch(error){
        if( error.response ){
            console.log(error.response.data);
        }
        res.json({result:"false",msg:"시스템 오류입니다. 다시 시도해 주세요."});
    }
});
app.get('/balance',async(req,res)=>{
    const {depositId} = req.query;
    if(depositId !== '' ) {
        try {
            const [etheum] = await request({
                json:true,
                method:"GET",
                uri:`${process.env.ENCLAVE}/api/v3/ethereum/wallets/${process.env.ETH_ID}/deposit-addresses/${depositId}/balance`,
                headers:headers,
                qs:{
                    ticker:`ETH`
                }
            });
            const [mileverse] = await request({
                json:true,
                method:"GET",
                uri:`${process.env.ENCLAVE}/api/v3/ethereum/wallets/${process.env.ETH_ID}/deposit-addresses/${depositId}/balance`,
                headers:headers,
                qs:{
                    ticker:`MVC`
                }
            });
            res.json({
                result:"success",
                eth:Number(Web3Utils.fromWei(etheum.amount,'ether')),
                mvc:Number(Web3Utils.fromWei(mileverse.amount,'ether'))
            })
        } catch(error) {
            if( error.response ){
                console.log(error.response.data);
            }
            res.json({result:"fail",msg:"시스템 오류입니다."});
        }
    } else {
        res.json({result:"fail",msg:"지갑이 조회되지 않습니다."});
    }
})

app.post("/transfer", async(req,res)=>{
    const {ticker,toAddr,send_amount} = req.body;
    if(ethereum_address.isAddress(toAddr)) {
        try {
            const {id} = await request({
                json:true,
                method: "POST",
                uri:`${process.env.ENCLAVE}/api/v3/ethereum/wallets/${process.env.ETH_ID}/transfer`,
                headers:headers,
                body:{
                    ticker:ticker,
                    to:toAddr,
                    amount:Web3Utils.toWei(String(send_amount),'ether'),
                    passphrase:process.env.PASS,
                }
            });
            if(id !== null) {
                res.json({result:"success"})
    
            } else {
                res.json({result:"false",msg:"다시 시도해주세요."})
            }
        } catch(error){
            if( error.response ){
                console.log(error.response.data);
            }
            res.json({result:"false",msg:"다시 시도해주세요."})
        }
    } else {
        res.json({result:"false",msg:'보내는 주소를 다시 확인해 주세요.'})
    }
});

app.post("/flush",async(req,res) =>{
    const {depositId,eth,mvc} = req.body;
    let lists = [];
    if(Number(eth) !== 0) {
        lists.push({coinId:"2",depositAddressId:depositId})
    }
    if(Number(mvc) !== 0) {
        lists.push({coinId:"157",depositAddressId:depositId})
    }
    if(lists.length !== 0) {
        try {
            await request({
                json:true,
                method:"POST",
                uri:`${process.env.ENCLAVE}/api/v3/ethereum/wallets/${process.env.ETH_ID}/flush`,
                headers:headers,
                body:{
                    targets:lists
                }
            })
            res.json({result:"success"})
        } catch(error) {
            if( error.response ){
                console.log(error.response.data);
            }
            res.json({result:"false",msg:"시스템 오류"})
        }
    } else {
        res.json({result:"false",msg:"직금할 금액이 없습니다."})
    }
});

app.listen(8989);